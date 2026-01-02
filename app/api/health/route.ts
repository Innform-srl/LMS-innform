import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application
 * Use for monitoring, load balancers, and uptime checks
 */
export async function GET() {
    const startTime = Date.now()

    try {
        // Check database connection
        await db.$queryRaw`SELECT 1`

        const responseTime = Date.now() - startTime

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {
                database: {
                    status: 'connected',
                    responseTime: `${responseTime}ms`
                },
                api: {
                    status: 'operational'
                }
            },
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV
        })
    } catch (error: any) {
        const responseTime = Date.now() - startTime

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            checks: {
                database: {
                    status: 'disconnected',
                    error: error.message,
                    responseTime: `${responseTime}ms`
                },
                api: {
                    status: 'degraded'
                }
            },
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV
        }, { status: 503 })
    }
}
