import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { startOfWeek, startOfMonth, subMonths, format } from "date-fns"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Global Stats
        const [
            totalUsers,
            totalCourses,
            totalEnrollments,
            totalCertificates,
            activeUsersThisWeek,
            completionsThisMonth
        ] = await Promise.all([
            db.user.count(),
            db.course.count({ where: { published: true } }),
            db.enrollment.count(),
            db.certificate.count(),
            0, // activeUsersThisWeek (lastLoginAt not implemented yet)
            db.enrollment.count({
                where: {
                    completed: true,
                    updatedAt: {
                        gte: startOfMonth(new Date())
                    }
                }
            })
        ])

        // Completion Rate
        const completedEnrollments = await db.enrollment.count({
            where: { completed: true }
        })
        const completionRate = totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0

        // Average Time per Course
        const avgTimeData = await db.enrollment.aggregate({
            _avg: { timeSpent: true },
            where: { completed: true }
        })
        const avgTimeSpent = avgTimeData._avg.timeSpent || 0

        // Enrollment Trend (last 6 months) - optimized with parallel queries
        const monthQueries = Array.from({ length: 6 }, (_, i) => {
            const idx = 5 - i
            const monthStart = startOfMonth(subMonths(new Date(), idx))
            const monthEnd = startOfMonth(subMonths(new Date(), idx - 1))
            const monthKey = format(monthStart, 'MMM yyyy')

            return db.enrollment.count({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lt: monthEnd
                    }
                }
            }).then(count => ({ month: monthKey, enrollments: count }))
        })

        const enrollmentTrend = await Promise.all(monthQueries)

        // Top Courses by Enrollment
        const topCourses = await db.course.findMany({
            take: 5,
            orderBy: {
                enrollments: { _count: 'desc' }
            },
            include: {
                _count: {
                    select: { enrollments: true }
                }
            },
            where: { published: true }
        })

        const topCoursesData = topCourses.map(course => ({
            title: course.title,
            enrollments: course._count.enrollments,
            id: course.id
        }))

        // Recent Activity (last 10 actions)
        const recentEnrollments = await db.enrollment.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                course: { select: { title: true } }
            }
        })

        const recentActivity = recentEnrollments.map(enrollment => ({
            id: enrollment.id,
            userName: enrollment.user.name || 'Unknown',
            userEmail: enrollment.user.email,
            courseTitle: enrollment.course.title,
            action: enrollment.completed ? 'Completed' : 'Enrolled',
            timestamp: enrollment.updatedAt,
            progress: enrollment.progress
        }))

        return NextResponse.json({
            overview: {
                totalUsers,
                totalCourses,
                totalEnrollments,
                totalCertificates,
                activeUsersThisWeek,
                completionsThisMonth,
                completionRate,
                avgTimeSpent: Math.round(avgTimeSpent)
            },
            charts: {
                enrollmentTrend,
                topCourses: topCoursesData
            },
            recentActivity
        })
    } catch (error) {
        console.error("[ANALYTICS_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
