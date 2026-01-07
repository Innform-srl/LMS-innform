import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
        }

        const body = await request.json()
        const { name } = body

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: { name },
            select: {
                id: true,
                name: true,
                email: true,
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
    }
}
