import { db } from "@/lib/db"
import { notifyTMSBadgeEarned } from "@/lib/tms-webhook-service"
import { calculateLevel, pointsForNextLevel } from "@/lib/gamification-utils"

// Re-export for backward compatibility
export { calculateLevel, pointsForNextLevel }

// Award points to user
export async function awardPoints(
    userId: string,
    points: number,
    _reason: string
): Promise<{ newTotal: number; leveledUp: boolean; newLevel: number }> {
    // Get or create user stats
    let stats = await db.userStats.findUnique({
        where: { userId }
    })

    if (!stats) {
        stats = await db.userStats.create({
            data: {
                userId,
                totalPoints: 0,
                level: 1
            }
        })
    }

    const newTotal = stats.totalPoints + points
    const oldLevel = stats.level
    const newLevel = calculateLevel(newTotal)
    const leveledUp = newLevel > oldLevel

    // Update stats
    await db.userStats.update({
        where: { userId },
        data: {
            totalPoints: newTotal,
            level: newLevel
        }
    })

    return { newTotal, leveledUp, newLevel }
}

// Update streak
export async function updateStreak(userId: string): Promise<number> {
    const stats = await db.userStats.findUnique({
        where: { userId }
    })

    if (!stats) {
        await db.userStats.create({
            data: {
                userId,
                currentStreak: 1,
                longestStreak: 1,
                lastActivityDate: new Date()
            }
        })
        return 1
    }

    const now = new Date()
    const lastActivity = stats.lastActivityDate

    if (!lastActivity) {
        // First activity
        await db.userStats.update({
            where: { userId },
            data: {
                currentStreak: 1,
                longestStreak: 1,
                lastActivityDate: now
            }
        })
        return 1
    }

    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

    let newStreak = stats.currentStreak

    if (daysDiff === 0) {
        // Same day, no change
        return stats.currentStreak
    } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = stats.currentStreak + 1
    } else {
        // Streak broken
        newStreak = 1
    }

    const newLongest = Math.max(newStreak, stats.longestStreak)

    await db.userStats.update({
        where: { userId },
        data: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastActivityDate: now
        }
    })

    // Award streak milestone points
    if (newStreak === 7) {
        await awardPoints(userId, 50, "STREAK_7_DAYS")
    } else if (newStreak === 30) {
        await awardPoints(userId, 200, "STREAK_30_DAYS")
    }

    return newStreak
}

// Check and unlock achievements
export async function checkAchievements(userId: string): Promise<string[]> {
    const unlockedAchievements: string[] = []

    // Get user stats
    const stats = await db.userStats.findUnique({
        where: { userId }
    })

    if (!stats) return []

    // Get all achievements
    const achievements = await db.achievement.findMany()

    // Get already unlocked achievements
    const userAchievements = await db.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true }
    })
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId))

    // Check each achievement
    for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) continue

        let shouldUnlock = false

        switch (achievement.requirementType) {
            case "COMPLETE_COURSES":
                shouldUnlock = stats.coursesCompleted >= achievement.requirementValue
                break
            case "PASS_QUIZZES":
                shouldUnlock = stats.quizzesCompleted >= achievement.requirementValue
                break
            case "STUDY_TIME":
                shouldUnlock = stats.totalStudyTime >= achievement.requirementValue
                break
            case "STREAK_DAYS":
                shouldUnlock = stats.currentStreak >= achievement.requirementValue
                break
            case "TOTAL_POINTS":
                shouldUnlock = stats.totalPoints >= achievement.requirementValue
                break
        }

        if (shouldUnlock) {
            // Unlock achievement
            await db.userAchievement.create({
                data: {
                    userId,
                    achievementId: achievement.id
                }
            })

            // Award achievement points
            await awardPoints(userId, achievement.points, `ACHIEVEMENT_${achievement.id}`)

            // Notify TMS about badge earned
            notifyTMSBadgeEarned(userId, achievement.id).catch(err =>
                console.error("[TMS_WEBHOOK] Badge earned notification failed:", err)
            )

            unlockedAchievements.push(achievement.id)
        }
    }

    return unlockedAchievements
}

// Track course completion
export async function trackCourseCompletion(userId: string, courseId: string) {
    await db.userStats.upsert({
        where: { userId },
        create: {
            userId,
            coursesCompleted: 1
        },
        update: {
            coursesCompleted: { increment: 1 }
        }
    })

    await awardPoints(userId, 100, `COURSE_COMPLETED_${courseId}`)
    await checkAchievements(userId)
}

// Track quiz completion
export async function trackQuizCompletion(userId: string, quizId: string, score: number) {
    await db.userStats.upsert({
        where: { userId },
        create: {
            userId,
            quizzesCompleted: 1
        },
        update: {
            quizzesCompleted: { increment: 1 }
        }
    })

    await awardPoints(userId, Math.round(score), `QUIZ_COMPLETED_${quizId}`)

    // Bonus for perfect score
    if (score === 100) {
        await awardPoints(userId, 50, `PERFECT_QUIZ_${quizId}`)
    }

    await checkAchievements(userId)
}

// Track study time
export async function trackStudyTime(userId: string, minutes: number) {
    await db.userStats.upsert({
        where: { userId },
        create: {
            userId,
            totalStudyTime: minutes
        },
        update: {
            totalStudyTime: { increment: minutes }
        }
    })

    await checkAchievements(userId)
}
