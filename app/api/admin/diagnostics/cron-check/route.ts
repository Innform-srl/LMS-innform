import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Check if CRON_SECRET is configured
        const cronSecretConfigured = !!process.env.CRON_SECRET

        // Try to find the most recent webhook event that was processed by cron
        // (events with status 'success' after a retry, or inactivity alerts)
        const lastCronActivity = await db.webhookEvent.findFirst({
            where: {
                OR: [
                    { retryCount: { gt: 0 } },
                    { eventType: 'inactivity_alert' }
                ]
            },
            orderBy: { processedAt: 'desc' },
            select: { processedAt: true, eventType: true }
        })

        // Count pending webhooks that need retry
        const pendingRetries = await db.webhookEvent.count({
            where: {
                status: 'failed',
                retryCount: { lt: 3 }
            }
        })

        return NextResponse.json({
            configured: cronSecretConfigured,
            lastRun: lastCronActivity?.processedAt || null,
            lastEventType: lastCronActivity?.eventType || null,
            pendingRetries,
            vercelCronConfigured: true // We know it's in vercel.json
        })
    } catch (error) {
        console.error('Cron check error:', error)
        return NextResponse.json({
            configured: !!process.env.CRON_SECRET,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
