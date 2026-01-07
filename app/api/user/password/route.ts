import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
        }

        const body = await request.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Password richieste" }, { status: 400 })
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "La nuova password deve avere almeno 8 caratteri" }, { status: 400 })
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { password: true }
        })

        if (!user?.password) {
            return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password)

        if (!isValidPassword) {
            return NextResponse.json({ error: "Password attuale non corretta" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await db.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error changing password:", error)
        return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
    }
}
