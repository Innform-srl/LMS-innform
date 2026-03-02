"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/permissions"
import { markModuleComplete } from "./video-progress"
import { reportError } from "@/lib/error-reporting"

export async function registerForLiveSession(sessionId: string, userId: string) {
    const check = await requireAuth()
    if (!check.authorized) {
        return { success: false, error: check.error }
    }
    const session = check.session
    if (session.user.id !== userId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Find the module associated with this session
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId },
            include: { module: true }
        })

        if (!liveSession?.module) {
            return { success: false, error: "Session module not found" }
        }

        // Mark module as complete since for LIVE sessions we bypass duration checks
        // This assumes joining the session counts as attendance/completion
        const result = await markModuleComplete(liveSession.module.id)

        return result
    } catch (error) {
        console.error("Error registering for live session:", error)
        reportError(error, { action: "registerForLiveSession" })
        return { success: false, error: "Failed to register" }
    }
}
