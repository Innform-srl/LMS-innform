import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Check if WebhookEvent table exists and count records
        const count = await db.webhookEvent.count()

        // Count recent events (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentCount = await db.webhookEvent.count({
            where: {
                createdAt: { gte: oneDayAgo }
            }
        })

        // Get stats by status
        const stats = await db.webhookEvent.groupBy({
            by: ['status'],
            _count: true
        })

        return NextResponse.json({
            exists: true,
            count,
            recentCount,
            stats: stats.reduce((acc, s) => {
                acc[s.status] = s._count
                return acc
            }, {} as Record<string, number>)
        })
    } catch (error) {
        console.error('WebhookEvent table check error:', error)

        // Check if it's a "table doesn't exist" error
        const errorMessage = error instanceof Error ? error.message : ''
        const tableNotFound = errorMessage.includes('does not exist') ||
            errorMessage.includes('relation') ||
            errorMessage.includes('WebhookEvent')

        return NextResponse.json({
            exists: false,
            message: tableNotFound
                ? 'Tabella WebhookEvent non trovata. Esegui la migrazione del database.'
                : 'Errore durante la verifica',
            error: errorMessage
        })
    }
}
