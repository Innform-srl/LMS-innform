import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        const { courseId } = await params
        const { minutes } = await req.json()

        const enrollment = await db.enrollment.update({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            data: {
                timeSpent: { increment: minutes },
                lastActivityAt: new Date()
            }
        })

        return NextResponse.json(enrollment)
    } catch (error) {
        console.error("[TIME_TRACKING_ERROR]", error)
        return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : "Unknown"}`, { status: 500 })
    }
}
