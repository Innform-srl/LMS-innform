import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Get or create default settings
        let settings = await db.certificateSettings.findFirst()

        if (!settings) {
            settings = await db.certificateSettings.create({
                data: {
                    companyName: "INNFORM S.r.l.",
                    signerName: "Direttore",
                    signerTitle: "Direttore Generale",
                    primaryColor: "#6366f1",
                    accentColor: "#8b5cf6",
                    headerText: "Certificato di Completamento",
                    bodyTemplate: "Questo certifica che {userName} ha completato con successo il corso {courseTitle} in data {completionDate}"
                }
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error("[CERTIFICATE_SETTINGS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const {
            companyName,
            signerName,
            signerTitle,
            primaryColor,
            accentColor,
            headerText,
            bodyTemplate,
            logoUrl
        } = body

        // Get existing settings or create new one
        const existing = await db.certificateSettings.findFirst()

        let settings
        if (existing) {
            settings = await db.certificateSettings.update({
                where: { id: existing.id },
                data: {
                    companyName,
                    signerName,
                    signerTitle,
                    primaryColor,
                    accentColor,
                    headerText,
                    bodyTemplate,
                    logoUrl
                }
            })
        } else {
            settings = await db.certificateSettings.create({
                data: {
                    companyName,
                    signerName,
                    signerTitle,
                    primaryColor,
                    accentColor,
                    headerText,
                    bodyTemplate,
                    logoUrl
                }
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error("[CERTIFICATE_SETTINGS_PUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
