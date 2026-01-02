"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { markModuleComplete } from "./video-progress"

export async function registerForLiveSession(sessionId: string, userId: string) {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
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
        return { success: false, error: "Failed to register" }
    }
}
