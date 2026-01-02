import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        await db.notification.update({
            where: {
                id,
                userId: session.user.id
            },
            data: {
                isRead: true
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
