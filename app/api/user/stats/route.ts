import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.user.id

        // Verify user exists first
        const user = await db.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        // Get user stats
        const stats = await db.userStats.findUnique({
            where: { userId }
        })

        if (!stats) {
            // Create default stats
            const newStats = await db.userStats.create({
                data: {
                    userId,
                    totalPoints: 0,
                    level: 1,
                    currentStreak: 0,
                    longestStreak: 0
                }
            })
            return NextResponse.json(newStats)
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error("[USER_STATS_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
