"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { notifyTMSProgressUpdate } from "@/lib/tms-webhook-service"
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils"
import { reportError } from "@/lib/error-reporting"

/**
 * Update video progress for a module
 * This updates the playback position (watchedSeconds) but does NOT necessarily mark as complete
 * if there is a minimum duration requirement.
 */
export async function updateVideoProgress(
    moduleId: string,
    watchedSeconds: number,
    totalSeconds: number,
    currentPosition: number
) {
    const check = await requireAuth()
    if (!check.authorized) {
        return { success: false, error: check.error }
    }
    const session = check.session

    try {
        // Get module to check minimum duration
        const courseModule = await db.module.findUnique({
            where: { id: moduleId },
            select: { minimumDuration: true, courseId: true }
        })

        // Check if video content is "watched" (90% threshold of video length)
        // This is about CONTENT completion, not TIME requirement
        let isContentComplete = totalSeconds > 0 && (watchedSeconds / totalSeconds) >= 0.9

        // Get current progress to check timeSpent (wall clock time)
        const currentProgress = await db.moduleProgress.findUnique({
            where: {
                userId_moduleId: {
                    userId: session.user.id,
                    moduleId
                }
            }
        })

        const timeSpent = currentProgress?.timeSpent || 0
        const minDurationSeconds = (courseModule?.minimumDuration || 0) * 60

        // Complete only if content is watched AND time requirement is met
        // If minimumDuration is 0, minDurationSeconds is 0, so timeSpent >= 0 is always true

        // RELAXED LOGIC: If the user has met the time requirement (and there IS one),
        // we consider the content complete. This handles cases where the video is shorter
        // than the minimum duration or if duration tracking is imperfect.
        if (minDurationSeconds > 0 && timeSpent >= minDurationSeconds) {
            isContentComplete = true
        }

        const isComplete = isContentComplete && timeSpent >= minDurationSeconds

        // Upsert module progress
        const progress = await db.moduleProgress.upsert({
            where: {
                userId_moduleId: {
                    userId: session.user.id,
                    moduleId
                }
            },
            update: {
                watchedSeconds, // Video playback position/accumulated watch
                totalSeconds,
                lastPosition: currentPosition,
                completed: isComplete,
                completedAt: isComplete && !currentProgress?.completed ? new Date() : undefined
            },
            create: {
                userId: session.user.id,
                moduleId,
                watchedSeconds,
                totalSeconds,
                lastPosition: currentPosition,
                completed: isComplete,
                completedAt: isComplete ? new Date() : undefined
            }
        })

        // If module is completed, update enrollment progress
        if (isComplete && courseModule) {
            await updateCourseProgress(courseModule.courseId, session.user.id)
        }

        return { success: true, progress }
    } catch (error) {
        console.error("Error updating video progress:", error)
        reportError(error, { action: "updateVideoProgress" })
        return { success: false, error: "Errore durante il salvataggio del progresso" }
    }
}

/**
 * Get video progress for a module
 */
export async function getVideoProgress(moduleId: string) {
    const check = await requireAuth()
    if (!check.authorized) {
        return null
    }
    const session = check.session

    try {
        const progress = await db.moduleProgress.findUnique({
            where: {
                userId_moduleId: {
                    userId: session.user.id,
                    moduleId
                }
            }
        })

        return progress
    } catch (error) {
        console.error("Error getting video progress:", error)
        reportError(error, { action: "getVideoProgress" })
        return null
    }
}

/**
 * Update overall course progress based on completed modules
 */
import { checkAndCompleteCourse } from "@/lib/progress"

/**
 * Update overall course progress based on completed modules
 */
async function updateCourseProgress(courseId: string, userId: string) {
    try {
        // Get total published modules
        const totalModules = await db.module.count({
            where: {
                courseId,
                ...effectivelyPublishedModuleWhere()
            }
        })

        if (totalModules === 0) return

        // Get completed modules for this user
        const completedModules = await db.moduleProgress.count({
            where: {
                userId,
                completed: true,
                module: {
                    courseId,
                    ...effectivelyPublishedModuleWhere()
                }
            }
        })

        // Calculate progress percentage (visual only)
        const progressPercentage = Math.min(100, Math.round((completedModules / totalModules) * 100))

        // Get current enrollment to check previous progress
        const currentEnrollment = await db.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            },
            select: { progress: true, tmsEnrollmentId: true }
        })

        const previousProgress = currentEnrollment?.progress || 0

        // Update enrollment progress (visual)
        await db.enrollment.update({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            },
            data: {
                progress: progressPercentage
            }
        })

        // Notify TMS if progress increased by 10% or more
        if (progressPercentage >= previousProgress + 10 || progressPercentage === 100) {
            notifyTMSProgressUpdate(userId, courseId, currentEnrollment?.tmsEnrollmentId || undefined).catch(err => {
                console.error("[TMS_WEBHOOK] Progress update notification failed:", err)
                reportError(err, { action: "updateCourseProgress.tmsWebhook" })
            })
        }

        // Check for strict completion (Certificates, etc.)
        await checkAndCompleteCourse(courseId, userId)

        revalidatePath(`/courses/${courseId}`)
        revalidatePath('/')
    } catch (error) {
        console.error("Error updating course progress:", error)
        reportError(error, { action: "updateCourseProgress" })
    }
}

/**
 * Track time spent on a module (incremental)
 * This updates the 'timeSpent' field which tracks wall-clock time
 */
export async function trackModuleTime(moduleId: string, seconds: number) {
    const check = await requireAuth()
    if (!check.authorized) {
        return { success: false, error: check.error }
    }
    const session = check.session

    try {
        // Get module to find courseId
        const courseModule = await db.module.findUnique({
            where: { id: moduleId },
            select: { courseId: true }
        })

        if (!courseModule) {
            return { success: false, error: "Modulo non trovato" }
        }

        const progress = await db.moduleProgress.upsert({
            where: {
                userId_moduleId: {
                    userId: session.user.id,
                    moduleId
                }
            },
            update: {
                timeSpent: { increment: seconds },
                updatedAt: new Date()
            },
            create: {
                userId: session.user.id,
                moduleId,
                timeSpent: seconds,
                updatedAt: new Date()
            }
        })

        // Also update Enrollment timeSpent
        await db.enrollment.update({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseModule.courseId
                }
            },
            data: {
                timeSpent: { increment: seconds },
                lastActivityAt: new Date()
            }
        })

        return { success: true, timeSpent: progress.timeSpent }
    } catch (error) {
        console.error("Error tracking module time:", error)
        reportError(error, { action: "trackModuleTime" })
        return { success: false, error: "Errore durante il tracciamento del tempo" }
    }
}

/**
 * Mark module as complete manually (for non-video modules or admin override)
 * Also performs the final check for minimum duration
 */
export async function markModuleComplete(moduleId: string) {
    const check = await requireAuth()
    if (!check.authorized) {
        return { success: false, error: check.error }
    }
    const session = check.session

    try {
        // Check minimum duration requirement
        const courseModule = await db.module.findUnique({
            where: { id: moduleId },
            select: { minimumDuration: true, courseId: true, contentType: true }
        })

        if (!courseModule) return { success: false, error: "Modulo non trovato" }

        if (courseModule.minimumDuration > 0 && courseModule.contentType !== 'LIVE') {
            const progress = await db.moduleProgress.findUnique({
                where: {
                    userId_moduleId: {
                        userId: session.user.id,
                        moduleId
                    }
                }
            })

            // Check timeSpent (wall clock), NOT watchedSeconds (video position)
            const timeSpent = progress?.timeSpent || 0
            const requiredSeconds = courseModule.minimumDuration * 60

            if (timeSpent < requiredSeconds) {
                const remainingMinutes = Math.ceil((requiredSeconds - timeSpent) / 60)
                return {
                    success: false,
                    error: `Devi studiare questo modulo per altri ${remainingMinutes} minuti prima di completarlo.`
                }
            }
        }

        await db.moduleProgress.upsert({
            where: {
                userId_moduleId: {
                    userId: session.user.id,
                    moduleId
                }
            },
            update: {
                completed: true,
                completedAt: new Date()
            },
            create: {
                userId: session.user.id,
                moduleId,
                completed: true,
                completedAt: new Date()
            }
        })

        // Update course progress
        await updateCourseProgress(courseModule.courseId, session.user.id)

        return { success: true }
    } catch (error) {
        console.error("Error marking module complete:", error)
        reportError(error, { action: "markModuleComplete" })
        return { success: false, error: "Errore durante il completamento del modulo" }
    }
}
