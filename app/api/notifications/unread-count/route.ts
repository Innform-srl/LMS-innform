import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const count = await db.notification.count({
            where: {
                userId: session.user.id,
                isRead: false
            }
        })

        return NextResponse.json({ count })
    } catch (error) {
        console.error('Error fetching unread count:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
