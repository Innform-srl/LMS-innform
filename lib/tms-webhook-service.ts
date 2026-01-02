/**
 * TMS Webhook Service
 * Handles outgoing webhooks to the Training Management System
 *
 * This service sends events to TMS when:
 * - User logs in for the first time
 * - Course progress is updated
 * - Quiz is completed
 * - Badge is earned
 * - Course is completed
 * - Certificate is issued
 * - User becomes inactive
 */

import { db } from '@/lib/db'
import {
  sendWebhookToTMS,
  type LMSProgressPayload,
  type LMSQuizPayload,
  type LMSBadgePayload,
  type LMSCertificatePayload,
  type LMSActivityPayload,
  type LMSCourseCompletedPayload,
  type LMSWebhookPayload,
} from '@/lib/webhook-utils'

// Endpoints for TMS integration
const TMS_ENDPOINTS = {
  PROGRESS: '/lms-integration/progress-webhook',
  CERTIFICATE: '/lms-integration/certificate-webhook',
  ACTIVITY: '/lms-integration/user-activity',
  COMPLETION: '/lms-integration/completion-webhook',
}

interface WebhookResult {
  success: boolean
  eventId?: string
  error?: string
}

/**
 * Log webhook event to database for tracking and retry
 */
async function logWebhookEvent(
  eventType: string,
  payload: unknown,
  result: { success: boolean; error?: string; response?: unknown }
): Promise<string> {
  const event = await db.webhookEvent.create({
    data: {
      source: 'lms',
      eventType,
      direction: 'outgoing',
      status: result.success ? 'success' : 'failed',
      requestPayload: payload as object,
      responsePayload: (result.response as object) || null,
      errorMessage: result.error,
      processedAt: result.success ? new Date() : null,
      retryCount: 0,
      nextRetryAt: result.success ? null : new Date(Date.now() + 5 * 60 * 1000),
    },
  })
  return event.id
}

/**
 * Send first login notification to TMS
 */
export async function notifyTMSFirstLogin(
  userId: string,
  metadata?: { device?: string; browser?: string; ipCountry?: string }
): Promise<WebhookResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const payload: LMSActivityPayload = {
      event: 'first_login',
      user_email: user.email,
      timestamp: new Date().toISOString(),
      metadata,
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.ACTIVITY, payload)
    const eventId = await logWebhookEvent('first_login', payload, result)

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] first_login:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send progress update to TMS
 * Called when progress increases by 10% or daily
 */
export async function notifyTMSProgressUpdate(
  userId: string,
  courseId: string,
  tmsEnrollmentId?: string
): Promise<WebhookResult> {
  try {
    const [user, enrollment, modules] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { course: true },
      }),
      db.module.findMany({
        where: { courseId, published: true },
        include: {
          moduleProgress: {
            where: { userId },
          },
        },
      }),
    ])

    if (!user || !enrollment) {
      return { success: false, error: 'User or enrollment not found' }
    }

    const modulesCompleted = modules.filter(m =>
      m.moduleProgress.some(mp => mp.completed)
    ).length

    const totalTimeSpent = modules.reduce((acc, m) => {
      const progress = m.moduleProgress[0]
      return acc + (progress?.timeSpent || 0)
    }, 0)

    // Find current module (first incomplete)
    const currentModule = modules.find(m =>
      !m.moduleProgress.some(mp => mp.completed)
    )

    const payload: LMSProgressPayload = {
      event: 'progress_updated',
      user_email: user.email,
      course_id: courseId,
      tms_enrollment_id: tmsEnrollmentId,
      progress: {
        percentage: Math.round(enrollment.progress),
        modules_completed: modulesCompleted,
        modules_total: modules.length,
        time_spent_minutes: Math.round(totalTimeSpent / 60),
        last_activity: enrollment.lastActivityAt.toISOString(),
        current_module: currentModule
          ? {
              id: currentModule.id,
              name: currentModule.title,
              type: currentModule.contentType || 'VIDEO',
            }
          : undefined,
      },
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.PROGRESS, payload)
    const eventId = await logWebhookEvent('progress_updated', payload, result)

    // Update enrollment with TMS sync timestamp on success
    if (result.success && enrollment) {
      await db.enrollment.update({
        where: { id: enrollment.id },
        data: { tmsSyncedAt: new Date() },
      })
    }

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] progress_updated:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send quiz completion notification to TMS
 */
export async function notifyTMSQuizCompleted(
  userId: string,
  quizAttemptId: string
): Promise<WebhookResult> {
  try {
    const attempt = await db.quizAttempt.findUnique({
      where: { id: quizAttemptId },
      include: {
        user: { select: { email: true } },
        quiz: {
          include: {
            module: {
              include: { course: true },
            },
            _count: { select: { attempts: true } },
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Quiz attempt not found' }
    }

    const userAttemptsCount = await db.quizAttempt.count({
      where: { userId, quizId: attempt.quizId },
    })

    const payload: LMSQuizPayload = {
      event: 'quiz_completed',
      user_email: attempt.user.email,
      course_id: attempt.quiz.module.courseId,
      quiz: {
        id: attempt.quizId,
        name: attempt.quiz.title,
        score: attempt.score,
        passed: attempt.passed,
        passing_score: attempt.quiz.passingScore,
        attempts: userAttemptsCount,
        time_taken_seconds: 0, // TODO: Track quiz time
      },
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.ACTIVITY, payload)
    const eventId = await logWebhookEvent('quiz_completed', payload, result)

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] quiz_completed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send badge earned notification to TMS
 */
export async function notifyTMSBadgeEarned(
  userId: string,
  achievementId: string
): Promise<WebhookResult> {
  try {
    const [user, achievement] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      db.achievement.findUnique({
        where: { id: achievementId },
      }),
    ])

    if (!user || !achievement) {
      return { success: false, error: 'User or achievement not found' }
    }

    const payload: LMSBadgePayload = {
      event: 'badge_earned',
      user_email: user.email,
      badge: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_url: achievement.icon,
        points: achievement.points,
        category: achievement.category,
      },
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.ACTIVITY, payload)
    const eventId = await logWebhookEvent('badge_earned', payload, result)

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] badge_earned:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send course completion notification to TMS
 */
export async function notifyTMSCourseCompleted(
  userId: string,
  courseId: string,
  tmsEnrollmentId?: string
): Promise<WebhookResult> {
  try {
    const [user, enrollment, modules, quizzes] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { course: true },
      }),
      db.module.findMany({
        where: { courseId, published: true },
        include: {
          moduleProgress: { where: { userId } },
        },
      }),
      db.quiz.findMany({
        where: { module: { courseId } },
        include: {
          attempts: {
            where: { userId, passed: true },
            take: 1,
          },
        },
      }),
    ])

    if (!user || !enrollment) {
      return { success: false, error: 'User or enrollment not found' }
    }

    const modulesCompleted = modules.filter(m =>
      m.moduleProgress.some(mp => mp.completed)
    ).length

    const totalTimeSpent = modules.reduce((acc, m) => {
      const progress = m.moduleProgress[0]
      return acc + (progress?.timeSpent || 0)
    }, 0)

    // Calculate average score from passed quizzes
    const passedQuizzes = quizzes.filter(q => q.attempts.length > 0)
    const avgScore = passedQuizzes.length > 0
      ? passedQuizzes.reduce((acc, q) => acc + (q.attempts[0]?.score || 0), 0) / passedQuizzes.length
      : 0

    const payload: LMSCourseCompletedPayload = {
      event: 'course_completed',
      user_email: user.email,
      course_id: courseId,
      tms_enrollment_id: tmsEnrollmentId,
      completion: {
        date: enrollment.completedAt?.toISOString() || new Date().toISOString(),
        final_score: Math.round(avgScore),
        time_spent_minutes: Math.round(totalTimeSpent / 60),
        modules_completed: modulesCompleted,
        quizzes_passed: passedQuizzes.length,
        quizzes_total: quizzes.length,
      },
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.COMPLETION, payload)
    const eventId = await logWebhookEvent('course_completed', payload, result)

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] course_completed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send certificate issued notification to TMS
 */
export async function notifyTMSCertificateIssued(
  certificateId: string
): Promise<WebhookResult> {
  try {
    const certificate = await db.certificate.findUnique({
      where: { id: certificateId },
      include: {
        enrollment: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            course: {
              include: {
                modules: {
                  where: { published: true },
                  include: {
                    moduleProgress: {
                      where: { completed: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!certificate) {
      return { success: false, error: 'Certificate not found' }
    }

    const { enrollment } = certificate
    const { user, course } = enrollment

    // Get user achievements (badges)
    const userAchievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 10,
    })

    const totalTimeSpent = course.modules.reduce((acc, m) => {
      const progress = m.moduleProgress[0]
      return acc + (progress?.timeSpent || 0)
    }, 0)

    const modulesCompleted = course.modules.filter(m =>
      m.moduleProgress.length > 0
    ).length

    // Get base URL for certificate links
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''

    const payload: LMSCertificatePayload = {
      event: 'certificate_issued',
      certificate: {
        id: certificate.id,
        user_email: user.email,
        user_name: user.name || user.email,
        course_id: course.id,
        course_name: course.title,
        issue_date: certificate.issuedAt.toISOString(),
        score: Math.round(enrollment.progress),
        time_spent_minutes: Math.round(totalTimeSpent / 60),
        modules_completed: modulesCompleted,
        certificate_url: `${baseUrl}/verify-certificate?code=${certificate.verificationCode}`,
        pdf_url: `${baseUrl}/api/certificates/${certificate.id}/download`,
        verification_code: certificate.verificationCode,
        badges: userAchievements.map(ua => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          icon: ua.achievement.icon,
          date: ua.unlockedAt.toISOString(),
        })),
      },
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.CERTIFICATE, payload)
    const eventId = await logWebhookEvent('certificate_issued', payload, result)

    // Update certificate with TMS sync timestamp on success
    if (result.success) {
      await db.certificate.update({
        where: { id: certificateId },
        data: { tmsSyncedAt: new Date() },
      })
    }

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] certificate_issued:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send inactivity alert to TMS
 * Called by cron job when user is inactive for 7+ days
 */
export async function notifyTMSInactivityAlert(
  userId: string,
  courseId: string,
  daysInactive: number
): Promise<WebhookResult> {
  try {
    const [user, enrollment] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
    ])

    if (!user || !enrollment) {
      return { success: false, error: 'User or enrollment not found' }
    }

    const payload: LMSActivityPayload = {
      event: 'inactivity_alert',
      user_email: user.email,
      course_id: courseId,
      days_inactive: daysInactive,
      last_activity: enrollment.lastActivityAt.toISOString(),
      progress_at_last_activity: Math.round(enrollment.progress),
    }

    const result = await sendWebhookToTMS(TMS_ENDPOINTS.ACTIVITY, payload)
    const eventId = await logWebhookEvent('inactivity_alert', payload, result)

    return { success: result.success, eventId, error: result.error }
  } catch (error) {
    console.error('[TMS_WEBHOOK_ERROR] inactivity_alert:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Retry failed webhooks
 * Called by cron job
 */
export async function retryFailedWebhooks(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const MAX_RETRIES = 3
  const now = new Date()

  // Find webhooks that need retry
  const failedEvents = await db.webhookEvent.findMany({
    where: {
      status: { in: ['failed', 'retry'] },
      retryCount: { lt: MAX_RETRIES },
      nextRetryAt: { lte: now },
      direction: 'outgoing',
    },
    take: 50,
  })

  let succeeded = 0
  let failed = 0

  for (const event of failedEvents) {
    try {
      // Determine endpoint based on event type
      let endpoint: string
      switch (event.eventType) {
        case 'progress_updated':
          endpoint = TMS_ENDPOINTS.PROGRESS
          break
        case 'certificate_issued':
        case 'certificate_revoked':
          endpoint = TMS_ENDPOINTS.CERTIFICATE
          break
        case 'course_completed':
          endpoint = TMS_ENDPOINTS.COMPLETION
          break
        default:
          endpoint = TMS_ENDPOINTS.ACTIVITY
      }

      const result = await sendWebhookToTMS(
        endpoint,
        event.requestPayload as unknown as LMSWebhookPayload
      )

      if (result.success) {
        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'success',
            responsePayload: (result.response as object) || null,
            processedAt: new Date(),
          },
        })
        succeeded++
      } else {
        const nextRetry = new Date(
          Date.now() + Math.pow(2, event.retryCount + 1) * 60 * 1000
        )

        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: event.retryCount + 1 >= MAX_RETRIES ? 'failed' : 'retry',
            retryCount: event.retryCount + 1,
            nextRetryAt: event.retryCount + 1 >= MAX_RETRIES ? null : nextRetry,
            errorMessage: result.error,
          },
        })
        failed++
      }
    } catch (error) {
      console.error(`[WEBHOOK_RETRY_ERROR] ${event.id}:`, error)
      failed++
    }
  }

  return {
    processed: failedEvents.length,
    succeeded,
    failed,
  }
}
