import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await db.notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
