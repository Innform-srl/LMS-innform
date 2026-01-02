"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateStreak, checkAchievements } from "@/lib/gamification"

export async function recordUserActivity() {
    const session = await auth()
    if (!session?.user?.id) return { success: false }

    try {
        const streak = await updateStreak(session.user.id)
        await checkAchievements(session.user.id)
        return { success: true, streak }
    } catch (error) {
        console.error("Error recording activity:", error)
        return { success: false }
    }
}

export async function getGamificationStats() {
    const session = await auth()
    if (!session?.user?.id) return null

    try {
        const stats = await db.userStats.findUnique({
            where: { userId: session.user.id }
        })

        if (!stats) return null

        return stats
    } catch (error) {
        console.error("Error fetching stats:", error)
        return null
    }
}
