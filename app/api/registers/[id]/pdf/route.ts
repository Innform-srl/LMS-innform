import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateFundedRegisterPDF, generateInternalRegisterPDF } from "@/lib/register-pdf-generator"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params

    try {
        const register = await db.classRegister.findUnique({
            where: { id },
            include: {
                course: { select: { title: true } },
                entries: {
                    orderBy: { date: "asc" },
                    include: {
                        attendances: {
                            include: {
                                participant: {
                                    include: {
                                        user: { select: { name: true, email: true } },
                                    },
                                },
                            },
                        },
                        instructorEntries: {
                            include: {
                                instructor: { select: { name: true, role: true } },
                            },
                        },
                    },
                },
                participants: {
                    include: {
                        user: { select: { name: true, email: true } },
                    },
                    orderBy: { user: { name: "asc" } },
                },
                instructors: {
                    orderBy: { name: "asc" },
                },
            },
        })

        if (!register) {
            return NextResponse.json({ error: "Registro non trovato" }, { status: 404 })
        }

        // Get certificate settings for company branding
        const certSettings = await db.certificateSettings.findFirst()

        const pdfSettings = {
            companyName: certSettings?.companyName || "LMS Innform",
            primaryColor: certSettings?.primaryColor || "#6366f1",
            accentColor: certSettings?.accentColor || "#8b5cf6",
        }

        // Prepare data
        const pdfData = {
            title: register.title,
            registerType: register.registerType as "FUNDED" | "INTERNAL",
            courseName: register.course.title,
            plannedHours: register.plannedHours,
            complianceThreshold: register.complianceThreshold,
            fundingBody: register.fundingBody,
            projectCode: register.projectCode,
            editionCode: register.editionCode,
            trainingLocation: register.trainingLocation,
            entries: register.entries.map((entry) => ({
                date: entry.date,
                startTime: entry.startTime,
                endTime: entry.endTime,
                pauseMinutes: entry.pauseMinutes,
                effectiveHours: entry.effectiveHours,
                topics: entry.topics,
                deliveryMode: entry.deliveryMode,
                instructors: entry.instructorEntries.map((ie) => ({
                    name: ie.instructor.name,
                    role: ie.instructor.role,
                    hoursDelivered: ie.hoursDelivered,
                })),
                attendances: entry.attendances.map((att) => ({
                    participantName: att.participant.user.name || "",
                    participantEmail: att.participant.user.email,
                    fiscalCode: att.participant.fiscalCode,
                    companyName: att.participant.companyName,
                    status: att.status,
                    hoursAttended: att.hoursAttended,
                    signedAt: att.signedAt,
                })),
            })),
            participants: register.participants.map((p) => ({
                name: p.user.name || "",
                email: p.user.email,
                fiscalCode: p.fiscalCode,
                companyName: p.companyName,
                jobTitle: p.jobTitle,
                totalHours: p.totalHours,
                elearningHours: p.elearningHours,
                isCompliant: p.isCompliant,
            })),
            instructors: register.instructors.map((i) => ({
                name: i.name,
                role: i.role,
                specialization: i.specialization,
                totalHours: i.totalHours,
            })),
        }

        // Generate PDF based on type
        const pdfBuffer =
            register.registerType === "FUNDED"
                ? await generateFundedRegisterPDF(pdfData, pdfSettings)
                : await generateInternalRegisterPDF(pdfData, pdfSettings)

        const filename = `registro-${register.course.title.replace(/\s+/g, "-").toLowerCase()}-${register.editionCode || "v1"}.pdf`

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": pdfBuffer.length.toString(),
            },
        })
    } catch (error) {
        console.error("Error generating register PDF:", error)
        return NextResponse.json(
            { error: "Errore durante la generazione del PDF" },
            { status: 500 }
        )
    }
}
