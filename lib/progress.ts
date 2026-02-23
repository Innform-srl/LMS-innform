import { db } from "@/lib/db"
import { sendCertificateEmail } from "@/lib/email"
import { generateCertificateNumber } from "@/lib/certificate-utils"
import {
    notifyTMSCourseCompleted,
    notifyTMSCertificateIssued
} from "@/lib/tms-webhook-service"

export async function checkAndCompleteCourse(courseId: string, userId: string) {
    console.log(`Checking completion for course ${courseId} user ${userId}`)

    // 1. Get Course with Modules and Quizzes
    const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                where: { published: true },
                include: { quiz: true }
            }
        }
    })

    if (!course) {
        console.log("Course not found")
        return { completed: false, reason: "Course not found" }
    }

    // 1b. Check if there are unpublished (draft) modules - don't complete if course has incomplete content
    const unpublishedModulesCount = await db.module.count({
        where: { courseId, published: false }
    })

    if (unpublishedModulesCount > 0) {
        console.log(`Course has ${unpublishedModulesCount} unpublished module(s), cannot mark as completed`)
        return { completed: false, reason: "Course has unpublished modules" }
    }

    // 2. Get Enrollment
    const enrollment = await db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { user: true }
    })

    if (!enrollment) {
        console.log("Enrollment not found")
        return { completed: false, reason: "Enrollment not found" }
    }

    // 3. Check Total Course Time (minutes)
    // enrollment.timeSpent is in seconds? No, schema says Int @default(0).
    // Let's check usage. trackModuleTime increments it.
    // In video-progress.ts: timeSpent: { increment: seconds }
    // So enrollment.timeSpent is in SECONDS.
    // course.minimumDuration is in MINUTES (schema comment: // Minimum time in minutes required to complete)

    const timeSpentMinutes = Math.floor(enrollment.timeSpent / 60)
    if (course.minimumDuration > 0 && timeSpentMinutes < course.minimumDuration) {
        console.log(`Total time not met: ${timeSpentMinutes}m < ${course.minimumDuration}m`)
        return { completed: false, reason: "Total course time not met" }
    }

    // 4. Check Each Module
    let _completedModulesCount = 0

    for (const courseModule of course.modules) {
        // Check Module Progress (Time + Content)
        const progress = await db.moduleProgress.findUnique({
            where: { userId_moduleId: { userId, moduleId: courseModule.id } }
        })

        if (!progress || !progress.completed) {
            console.log(`Module ${courseModule.title} not completed`)
            return { completed: false, reason: `Module ${courseModule.title} not completed` }
        }

        // Check Quiz (if exists)
        if (courseModule.quiz) {
            const passedAttempt = await db.quizAttempt.findFirst({
                where: {
                    quizId: courseModule.quiz.id,
                    userId,
                    passed: true
                }
            })

            if (!passedAttempt) {
                console.log(`Quiz for module ${courseModule.title} not passed`)
                return { completed: false, reason: `Quiz for module ${courseModule.title} not passed` }
            }
        }

        _completedModulesCount++
    }

    // 5. If all checks pass, mark course as completed
    if (!enrollment.completed) {
        console.log("All checks passed. Completing course...")

        await db.enrollment.update({
            where: { id: enrollment.id },
            data: {
                completed: true,
                completedAt: new Date(),
                progress: 100
            }
        })

        // Generate Certificate
        const existingCert = await db.certificate.findUnique({
            where: { enrollmentId: enrollment.id }
        })

        if (!existingCert) {
            const cert = await db.certificate.create({
                data: {
                    enrollmentId: enrollment.id,
                    certificateNumber: generateCertificateNumber(),
                }
            })

            // Send email
            if (enrollment.user.email) {
                await sendCertificateEmail(
                    enrollment.user.email,
                    enrollment.user.name || "Studente",
                    course.title,
                    cert.certificateNumber,
                    cert.id,
                    cert.verificationCode
                )
            }

            // Track Gamification
            const { trackCourseCompletion } = await import("@/lib/gamification")
            await trackCourseCompletion(enrollment.userId, courseId)

            // Notify TMS about course completion and certificate
            notifyTMSCourseCompleted(userId, courseId).catch(err =>
                console.error("[TMS_WEBHOOK] Course completion notification failed:", err)
            )
            notifyTMSCertificateIssued(cert.id).catch(err =>
                console.error("[TMS_WEBHOOK] Certificate notification failed:", err)
            )
        }

        return { completed: true }
    }

    return { completed: true, alreadyCompleted: true }
}
