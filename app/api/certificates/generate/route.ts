import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateCertificateNumber } from "@/lib/utils"
import { sendCertificateEmail } from "@/lib/email"

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { enrollmentId } = await req.json()

        // Get enrollment with course and user info
        const enrollment = await db.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                course: true,
                user: true,
                certificate: true
            }
        })

        if (!enrollment) {
            return new NextResponse("Enrollment not found", { status: 404 })
        }

        // Verify the enrollment belongs to the current user (security)
        if (enrollment.userId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // Check if certificate already exists
        if (enrollment.certificate) {
            return NextResponse.json({
                message: "Certificate already exists",
                certificate: enrollment.certificate
            })
        }

        // Check if course is completed and minimum time met
        if (!enrollment.completed) {
            return new NextResponse("Course not completed", { status: 400 })
        }

        if (enrollment.course.minimumDuration > 0 && enrollment.timeSpent < enrollment.course.minimumDuration) {
            return new NextResponse("Minimum time requirement not met", { status: 400 })
        }

        // Generate certificate number
        const certificateNumber = await generateCertificateNumber()

        // Create certificate
        const certificate = await db.certificate.create({
            data: {
                certificateNumber,
                enrollmentId: enrollment.id
            }
        })

        // Send certificate email (non-blocking)
        if (enrollment.user.email) {
            sendCertificateEmail(
                enrollment.user.email,
                enrollment.user.name || "Studente",
                enrollment.course.title,
                certificate.certificateNumber,
                certificate.id,
                certificate.verificationCode
            ).catch(error => {
                console.error("[CERTIFICATE_GEN] Failed to send email:", error)
                // Don't fail the request if email fails
            })
        }

        return NextResponse.json({
            message: "Certificate generated successfully",
            certificate,
            userName: enrollment.user.name
        })
    } catch (error) {
        console.error("[CERTIFICATE_GENERATE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
