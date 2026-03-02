"use server"

import { requireAuth } from "@/lib/permissions"
import { db } from "@/lib/db"
import { updateStreak, checkAchievements } from "@/lib/gamification"
import { reportError } from "@/lib/error-reporting"

export async function recordUserActivity() {
    const check = await requireAuth()
    if (!check.authorized) return { success: false }
    const session = check.session

    try {
        const streak = await updateStreak(session.user.id)
        await checkAchievements(session.user.id)
        return { success: true, streak }
    } catch (error) {
        console.error("Error recording activity:", error)
        reportError(error, { action: "recordUserActivity" })
        return { success: false }
    }
}

export async function getGamificationStats() {
    const check = await requireAuth()
    if (!check.authorized) return null
    const session = check.session

    try {
        const stats = await db.userStats.findUnique({
            where: { userId: session.user.id }
        })

        if (!stats) return null

        return stats
    } catch (error) {
        console.error("Error fetching stats:", error)
        reportError(error, { action: "getGamificationStats" })
        return null
    }
}
