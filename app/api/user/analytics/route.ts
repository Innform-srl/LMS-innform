import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { subMonths, format } from "date-fns"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.user.id

        // User's enrollments with courses
        const enrollments = await db.enrollment.findMany({
            where: { userId },
            include: {
                course: true,
                certificate: true
            }
        })

        // Stats
        const totalEnrollments = enrollments.length
        const completedCourses = enrollments.filter(e => e.completed).length
        const inProgressCourses = enrollments.filter(e => !e.completed).length
        const totalCertificates = enrollments.filter(e => e.certificate).length
        const totalTimeSpent = enrollments.reduce((sum, e) => sum + e.timeSpent, 0)

        // Completion rate
        const completionRate = totalEnrollments > 0
            ? Math.round((completedCourses / totalEnrollments) * 100)
            : 0

        // Progress over time (last 6 months)
        const _sixMonthsAgo = subMonths(new Date(), 6)
        const monthlyProgress = new Map()

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i)
            const monthKey = format(date, 'MMM yyyy')
            monthlyProgress.set(monthKey, { completed: 0, enrolled: 0 })
        }

        enrollments.forEach(enrollment => {
            const monthKey = format(new Date(enrollment.createdAt), 'MMM yyyy')
            if (monthlyProgress.has(monthKey)) {
                const data = monthlyProgress.get(monthKey)!
                data.enrolled++
                if (enrollment.completed) data.completed++
            }
        })

        const progressTrend = Array.from(monthlyProgress.entries()).map(([month, data]) => ({
            month,
            ...data
        }))

        // Upcoming deadlines
        const upcomingDeadlines = enrollments
            .filter(e => !e.completed && e.dueDate && e.dueDate >= new Date())
            .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
            .slice(0, 5)
            .map(e => ({
                courseTitle: e.course.title,
                dueDate: e.dueDate,
                progress: e.progress,
                courseId: e.course.id
            }))

        // Recent achievements (recent completions)
        const recentAchievements = enrollments
            .filter(e => e.completed)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 5)
            .map(e => ({
                courseTitle: e.course.title,
                completedAt: e.updatedAt,
                hasCertificate: !!e.certificate,
                certificateNumber: e.certificate?.certificateNumber
            }))

        return NextResponse.json({
            overview: {
                totalEnrollments,
                completedCourses,
                inProgressCourses,
                totalCertificates,
                totalTimeSpent,
                completionRate
            },
            progressTrend,
            upcomingDeadlines,
            recentAchievements
        })
    } catch (error) {
        console.error("[USER_ANALYTICS_API]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
