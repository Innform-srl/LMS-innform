import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

// Cache analytics data for 5 minutes
let analyticsCache: { data: unknown; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check cache first
        if (analyticsCache && Date.now() - analyticsCache.timestamp < CACHE_DURATION) {
            return NextResponse.json(analyticsCache.data, {
                headers: {
                    'X-Cache': 'HIT',
                    'Cache-Control': 'private, max-age=300'
                }
            })
        }

        // Use database aggregation instead of loading all enrollments
        const [
            totalUsers,
            totalCourses,
            totalEnrollments,
            avgProgressResult,
            activeUsersCount
        ] = await Promise.all([
            db.user.count({ where: { role: 'EMPLOYEE' } }),
            db.course.count({ where: { published: true } }),
            db.enrollment.count(),
            db.enrollment.aggregate({
                _avg: { progress: true }
            }),
            // Active users in last 7 days
            db.auditLog.groupBy({
                by: ['userId'],
                where: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    userId: { not: null }
                }
            }).then(res => res.length)
        ])

        const avgCompletion = avgProgressResult._avg.progress || 0

        const responseData = {
            totalUsers,
            totalCourses,
            totalEnrollments,
            avgCompletion: Math.round(avgCompletion),
            activeUsers: activeUsersCount
        }

        // Update cache
        analyticsCache = {
            data: responseData,
            timestamp: Date.now()
        }

        return NextResponse.json(responseData, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'private, max-age=300'
            }
        })
    } catch (error) {
        console.error('Analytics error:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
