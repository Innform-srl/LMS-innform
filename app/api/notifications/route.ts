import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const notifications = await db.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    })

    return NextResponse.json(notifications)
}

export async function PATCH(req: Request) {
    const session = await auth()
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = await req.json()

    await db.notification.update({
        where: { id, userId: session.user.id },
        data: { isRead: true }
    })

    return NextResponse.json({ success: true })
}
