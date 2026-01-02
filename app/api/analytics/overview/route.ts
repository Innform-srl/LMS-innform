import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const [
            totalUsers,
            totalCourses,
            totalEnrollments,
            enrollments
        ] = await Promise.all([
            db.user.count({ where: { role: 'EMPLOYEE' } }),
            db.course.count({ where: { published: true } }),
            db.enrollment.count(),
            db.enrollment.findMany({ select: { progress: true } })
        ])

        const avgCompletion = enrollments.length > 0
            ? enrollments.reduce((acc, curr) => acc + curr.progress, 0) / enrollments.length
            : 0

        // Active users in last 7 days (based on AuditLog)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const activeUsersCount = await db.auditLog.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: sevenDaysAgo }
            },
            _count: true
        }).then(res => res.length)

        return NextResponse.json({
            totalUsers,
            totalCourses,
            totalEnrollments,
            avgCompletion: Math.round(avgCompletion),
            activeUsers: activeUsersCount
        })
    } catch (error) {
        console.error('Analytics error:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
