'use server'

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function getAnalyticsData() {
    const check = await requirePermission("analytics:view")
    if (!check.authorized) throw new Error(check.error)

    const [
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalQuizAttempts
    ] = await Promise.all([
        db.user.count({ where: { role: "EMPLOYEE" } }),
        db.course.count(),
        db.enrollment.count(),
        db.quizAttempt.count()
    ])

    // Get quiz performance data
    const quizAttempts = await db.quizAttempt.findMany({
        include: {
            quiz: {
                select: {
                    title: true
                }
            }
        }
    })

    // Calculate pass rate per quiz
    const quizStats = quizAttempts.reduce((acc, attempt) => {
        const quizTitle = attempt.quiz.title
        if (!acc[quizTitle]) {
            acc[quizTitle] = { total: 0, passed: 0 }
        }
        acc[quizTitle].total += 1
        if (attempt.passed) {
            acc[quizTitle].passed += 1
        }
        return acc
    }, {} as Record<string, { total: number, passed: number }>)

    const quizPerformance = Object.entries(quizStats).map(([name, stats]) => ({
        name,
        passRate: Math.round((stats.passed / stats.total) * 100),
        totalAttempts: stats.total
    }))

    // Get enrollment progress distribution
    const enrollments = await db.enrollment.findMany({
        select: { progress: true }
    })

    const progressDistribution = [
        { name: '0-25%', count: 0 },
        { name: '26-50%', count: 0 },
        { name: '51-75%', count: 0 },
        { name: '76-100%', count: 0 },
    ]

    enrollments.forEach(e => {
        if (e.progress <= 25) progressDistribution[0].count++
        else if (e.progress <= 50) progressDistribution[1].count++
        else if (e.progress <= 75) progressDistribution[2].count++
        else progressDistribution[3].count++
    })

    // Get recent activity (last 5 quiz attempts)
    const recentActivity = await db.quizAttempt.findMany({
        take: 5,
        orderBy: { completedAt: 'desc' },
        include: {
            user: { select: { name: true, email: true } },
            quiz: { select: { title: true } }
        }
    })

    // Get top learners (most time spent) - optimized with single query
    const topLearnersData = await db.moduleProgress.groupBy({
        by: ['userId'],
        _sum: {
            timeSpent: true
        },
        orderBy: {
            _sum: {
                timeSpent: 'desc'
            }
        },
        take: 5
    })

    // Fetch all users in a single query instead of N+1
    const userIds = topLearnersData.map(item => item.userId)
    const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
    })
    const userMap = new Map(users.map(u => [u.id, { name: u.name, email: u.email }]))

    const topLearners = topLearnersData.map(item => ({
        user: userMap.get(item.userId) || null,
        totalSeconds: item._sum.timeSpent || 0
    }))

    const completedEnrollments = await db.enrollment.count({
        where: { progress: 100 }
    })

    const activeEnrollments = totalEnrollments - completedEnrollments
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0

    return {
        overview: {
            totalUsers,
            totalCourses,
            activeEnrollments,
            completionRate,
            totalQuizAttempts
        },
        quizPerformance,
        progressDistribution,
        recentActivity,
        topLearners
    }
}
