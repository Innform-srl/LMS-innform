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

        // Get all achievements
        const allAchievements = await db.achievement.findMany({
            orderBy: [
                { category: 'asc' },
                { requirementValue: 'asc' }
            ]
        })

        // Get user's unlocked achievements
        const userAchievements = await db.userAchievement.findMany({
            where: { userId },
            include: {
                achievement: true
            },
            orderBy: { unlockedAt: 'desc' }
        })

        // Get user stats for progress calculation
        const stats = await db.userStats.findUnique({
            where: { userId }
        })

        // Calculate progress for each achievement
        const achievementsWithProgress = allAchievements.map(achievement => {
            const isUnlocked = userAchievements.some(ua => ua.achievementId === achievement.id)
            const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id)

            let progress = 0
            let current = 0

            if (stats && !isUnlocked) {
                switch (achievement.requirementType) {
                    case "COMPLETE_COURSES":
                        current = stats.coursesCompleted
                        break
                    case "PASS_QUIZZES":
                        current = stats.quizzesCompleted
                        break
                    case "STUDY_TIME":
                        current = stats.totalStudyTime
                        break
                    case "STREAK_DAYS":
                        current = stats.currentStreak
                        break
                    case "TOTAL_POINTS":
                        current = stats.totalPoints
                        break
                }
                progress = Math.min((current / achievement.requirementValue) * 100, 100)
            } else if (isUnlocked) {
                progress = 100
            }

            return {
                ...achievement,
                unlocked: isUnlocked,
                unlockedAt: userAchievement?.unlockedAt || null,
                progress,
                current,
                required: achievement.requirementValue
            }
        })

        return NextResponse.json({
            achievements: achievementsWithProgress,
            totalUnlocked: userAchievements.length,
            totalAvailable: allAchievements.length
        })
    } catch (error) {
        console.error("[USER_ACHIEVEMENTS_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
