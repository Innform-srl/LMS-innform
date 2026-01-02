/**
 * TMS Sync Cron Job
 *
 * Handles:
 * 1. Retry failed webhook events
 * 2. Send inactivity alerts for users inactive 7+ days
 *
 * Should be called daily via Vercel cron or external scheduler
 * Protected by CRON_SECRET authorization
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  retryFailedWebhooks,
  notifyTMSInactivityAlert,
} from '@/lib/tms-webhook-service'
import { alertCronError, alertWebhookFailed } from '@/lib/webhook-alerts'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const results = {
      webhookRetry: { processed: 0, succeeded: 0, failed: 0 },
      inactivityAlerts: { sent: 0, errors: 0 },
    }

    // 1. Retry failed webhooks
    try {
      results.webhookRetry = await retryFailedWebhooks()
      console.log('[TMS_SYNC] Webhook retry results:', results.webhookRetry)

      // Alert if webhooks exhausted all retries
      if (results.webhookRetry.failed > 0) {
        // Get failed webhooks to include in alert
        const failedWebhooks = await db.webhookEvent.findMany({
          where: {
            status: 'failed',
            retryCount: { gte: 3 }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        for (const webhook of failedWebhooks) {
          await alertWebhookFailed(
            webhook.id,
            webhook.eventType,
            webhook.errorMessage || 'Unknown error',
            webhook.retryCount
          )
        }
      }
    } catch (error) {
      console.error('[TMS_SYNC] Error retrying webhooks:', error)
      await alertCronError(
        error instanceof Error ? error.message : 'Unknown error',
        { phase: 'webhook_retry' }
      )
    }

    // 2. Check for inactive users and send alerts
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Find enrollments with last activity more than 7 days ago
    // that haven't been completed and haven't had an alert sent recently
    const inactiveEnrollments = await db.enrollment.findMany({
      where: {
        completed: false,
        lastActivityAt: { lt: sevenDaysAgo },
        // Only check if TMS integration is enabled (has due date, likely from TMS)
        dueDate: { not: null },
      },
      include: {
        user: { select: { id: true, email: true } },
        course: { select: { id: true, title: true } },
        reminders: {
          where: {
            type: 'INACTIVITY_7_DAYS',
            sentAt: { gt: sevenDaysAgo }, // Don't send if already sent in last 7 days
          },
        },
      },
    })

    for (const enrollment of inactiveEnrollments) {
      // Skip if reminder already sent recently
      if (enrollment.reminders.length > 0) continue

      const daysInactive = Math.floor(
        (Date.now() - enrollment.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      try {
        const result = await notifyTMSInactivityAlert(
          enrollment.userId,
          enrollment.courseId,
          daysInactive
        )

        if (result.success) {
          // Log reminder to prevent duplicate alerts
          await db.reminder.create({
            data: {
              enrollmentId: enrollment.id,
              type: 'INACTIVITY_7_DAYS',
            },
          })
          results.inactivityAlerts.sent++
        } else {
          results.inactivityAlerts.errors++
        }
      } catch (error) {
        console.error(`[TMS_SYNC] Error sending inactivity alert for ${enrollment.id}:`, error)
        results.inactivityAlerts.errors++
      }
    }

    console.log('[TMS_SYNC] Inactivity alert results:', results.inactivityAlerts)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('[TMS_SYNC_ERROR]', error)

    // Send alert for critical cron errors
    await alertCronError(
      error instanceof Error ? error.message : 'Unknown error',
      { phase: 'main' }
    ).catch(e => console.error('[ALERT] Failed to send cron error alert:', e))

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
