import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') || 'all-time' // week, month, all-time
        const limit = parseInt(searchParams.get('limit') || '100')

        let dateFilter = {}

        if (period === 'week') {
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            dateFilter = { updatedAt: { gte: weekAgo } }
        } else if (period === 'month') {
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            dateFilter = { updatedAt: { gte: monthAgo } }
        }

        // Get top users by points
        const topUsers = await db.userStats.findMany({
            where: dateFilter,
            take: limit,
            orderBy: { totalPoints: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        const leaderboard = topUsers.map((stats, index) => ({
            rank: index + 1,
            userId: stats.userId,
            userName: stats.user.name || 'Unknown',
            totalPoints: stats.totalPoints,
            level: stats.level,
            coursesCompleted: stats.coursesCompleted,
            currentStreak: stats.currentStreak
        }))

        return NextResponse.json({ leaderboard, period })
    } catch (error) {
        console.error("[LEADERBOARD_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
