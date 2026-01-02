import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { trackCourseCompletion, trackQuizCompletion, checkAchievements } from "@/lib/gamification"

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.user.id
        const { points, reason, metadata } = await req.json()

        // Different tracking based on reason
        if (reason.startsWith('COURSE_COMPLETED_')) {
            await trackCourseCompletion(userId, metadata.courseId)
        } else if (reason.startsWith('QUIZ_COMPLETED_')) {
            await trackQuizCompletion(userId, metadata.quizId, points)
        } else {
            // General points without specific tracking
            await checkAchievements(userId)
        }

        // Get updated stats
        const stats = await db.userStats.findUnique({
            where: { userId }
        })

        return NextResponse.json({ success: true, stats })
    } catch (error) {
        console.error("[ADD_POINTS_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
