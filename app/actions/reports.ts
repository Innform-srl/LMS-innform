"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils"

export async function getTimeTrackingReport(options?: {
    page?: number
    pageSize?: number
    userId?: string
    courseId?: string
    status?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const page = options?.page || 1
        const pageSize = options?.pageSize || 50
        const skip = (page - 1) * pageSize

        // Build where clause for filtering
        const where: Prisma.EnrollmentWhereInput = {}
        if (options?.userId) where.userId = options.userId
        if (options?.courseId) where.courseId = options.courseId
        if (options?.status === "completed") where.completed = true
        else if (options?.status === "in_progress") where.completed = false

        // Get total count for pagination
        const totalCount = await db.enrollment.count({ where })

        const enrollments = await db.enrollment.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        minimumDuration: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize
        })

        const reportData = enrollments.map(enrollment => ({
            userId: enrollment.user.id,
            userName: enrollment.user.name || enrollment.user.email || "N/A",
            userEmail: enrollment.user.email,
            userDepartment: enrollment.user.department,
            courseId: enrollment.course.id,
            courseTitle: enrollment.course.title,
            timeSpent: enrollment.timeSpent,
            minimumDuration: enrollment.course.minimumDuration,
            progress: enrollment.progress,
            completed: enrollment.completed,
            completedAt: enrollment.completedAt,
            enrolledAt: enrollment.createdAt,
            // Calculate status
            status: enrollment.completed
                ? "Completato"
                : enrollment.course.minimumDuration > 0 && enrollment.timeSpent >= enrollment.course.minimumDuration
                    ? "Tempo OK - In Corso"
                    : enrollment.course.minimumDuration > 0
                        ? "Tempo Insufficiente"
                        : "In Corso"
        }))

        return {
            success: true,
            data: reportData,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSize)
            }
        }
    } catch (error) {
        console.error("Error fetching time tracking report:", error)
        return { success: false, error: "Errore durante il recupero dei dati" }
    }
}

export async function getEngagementReport() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        // Use aggregations instead of fetching all records
        const [
            totalUsersCount,
            totalEnrollmentsCount,
            completedEnrollmentsCount,
            totalQuizAttemptsCount,
            passedQuizAttemptsCount,
            activeUsers7Days,
            activeUsers30Days,
            enrollmentStats,
            quizAvgScore
        ] = await Promise.all([
            db.user.count({ where: { role: "EMPLOYEE" } }),
            db.enrollment.count(),
            db.enrollment.count({ where: { completed: true } }),
            db.quizAttempt.count(),
            db.quizAttempt.count({ where: { passed: true } }),
            db.moduleProgress.groupBy({
                by: ['userId'],
                where: { updatedAt: { gte: sevenDaysAgo } }
            }).then(r => r.length),
            db.moduleProgress.groupBy({
                by: ['userId'],
                where: { updatedAt: { gte: thirtyDaysAgo } }
            }).then(r => r.length),
            db.enrollment.aggregate({
                _sum: { timeSpent: true }
            }),
            db.quizAttempt.aggregate({
                _avg: { score: true }
            })
        ])

        const tmsSyncedEnrollments = await db.enrollment.count({ where: { tmsSyncedAt: { not: null } } })
        const totalStudyTimeMinutes = enrollmentStats._sum.timeSpent || 0
        const avgStudyTimePerUser = totalUsersCount > 0 ? totalStudyTimeMinutes / totalUsersCount : 0
        const completionRate = totalEnrollmentsCount > 0 ? (completedEnrollmentsCount / totalEnrollmentsCount) * 100 : 0
        const quizPassRate = totalQuizAttemptsCount > 0 ? (passedQuizAttemptsCount / totalQuizAttemptsCount) * 100 : 0

        // Get top courses - limited query with aggregation
        const topCoursesData = await db.enrollment.groupBy({
            by: ['courseId'],
            _count: { id: true },
            _sum: { timeSpent: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        })

        const courseIds = topCoursesData.map(c => c.courseId)
        const courses = await db.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true }
        })
        const courseMap = new Map(courses.map(c => [c.id, c.title]))

        const completedByCourse = await db.enrollment.groupBy({
            by: ['courseId'],
            where: { courseId: { in: courseIds }, completed: true },
            _count: { id: true }
        })
        const completedMap = new Map(completedByCourse.map(c => [c.courseId, c._count.id]))

        const topCourses = topCoursesData.map(c => ({
            courseId: c.courseId,
            courseTitle: courseMap.get(c.courseId) || 'Unknown',
            enrollments: c._count.id,
            completions: completedMap.get(c.courseId) || 0,
            totalTime: c._sum.timeSpent || 0,
            avgTime: c._count.id > 0 ? (c._sum.timeSpent || 0) / c._count.id : 0
        }))

        // Get top users by study time - limited query
        const topUsersData = await db.enrollment.groupBy({
            by: ['userId'],
            _sum: { timeSpent: true },
            orderBy: { _sum: { timeSpent: 'desc' } },
            take: 10
        })

        const userIds = topUsersData.map(u => u.userId)
        const users = await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, department: { select: { name: true } } }
        })
        const userMap = new Map(users.map(u => [u.id, u]))

        // Get module completion counts for top users
        const moduleCompletions = await db.moduleProgress.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, completed: true },
            _count: { id: true }
        })
        const moduleCompletionMap = new Map(moduleCompletions.map(m => [m.userId, m._count.id]))

        // Get quiz pass counts for top users
        const quizPasses = await db.quizAttempt.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, passed: true },
            _count: { id: true }
        })
        const quizPassMap = new Map(quizPasses.map(q => [q.userId, q._count.id]))

        // Get last activity for top users
        const lastActivities = await db.moduleProgress.findMany({
            where: { userId: { in: userIds } },
            orderBy: { updatedAt: 'desc' },
            distinct: ['userId'],
            select: { userId: true, updatedAt: true }
        })
        const lastActivityMap = new Map(lastActivities.map(la => [la.userId, la.updatedAt]))

        const topUsers = topUsersData.map(u => {
            const user = userMap.get(u.userId)
            return {
                userId: u.userId,
                userName: user?.name || user?.email || 'N/A',
                userEmail: user?.email || null,
                department: user?.department?.name || null,
                studyTime: u._sum.timeSpent || 0,
                modulesCompleted: moduleCompletionMap.get(u.userId) || 0,
                quizzesPassed: quizPassMap.get(u.userId) || 0,
                lastActivity: lastActivityMap.get(u.userId) || null
            }
        })

        // Count inactive users
        const inactiveUsersCount = await db.user.count({
            where: {
                role: "EMPLOYEE",
                OR: [
                    { moduleProgress: { none: { updatedAt: { gte: thirtyDaysAgo } } } },
                    { moduleProgress: { none: {} } }
                ]
            }
        })

        return {
            success: true,
            data: {
                overview: {
                    totalUsers: totalUsersCount,
                    activeUsersLast7Days: activeUsers7Days,
                    activeUsersLast30Days: activeUsers30Days,
                    totalEnrollments: totalEnrollmentsCount,
                    completedEnrollments: completedEnrollmentsCount,
                    completionRate,
                    totalStudyTimeMinutes,
                    avgStudyTimePerUser,
                    tmsSyncedEnrollments
                },
                quizStats: {
                    totalAttempts: totalQuizAttemptsCount,
                    passedAttempts: passedQuizAttemptsCount,
                    passRate: quizPassRate,
                    avgScore: quizAvgScore._avg.score || 0
                },
                topCourses,
                topUsers,
                inactiveUsersCount
            }
        }
    } catch (error) {
        console.error("Error fetching engagement report:", error)
        return { success: false, error: "Errore durante il recupero dei dati" }
    }
}

export async function exportTimeTrackingCSV() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    const result = await getTimeTrackingReport()
    if (!result.success || !result.data) {
        return { success: false, error: result.error }
    }

    // Generate CSV
    const headers = [
        "Utente",
        "Email",
        "Dipartimento",
        "Corso",
        "Tempo Trascorso (min)",
        "Tempo Richiesto (min)",
        "Tempo Trascorso (h)",
        "Tempo Richiesto (h)",
        "Progresso (%)",
        "Stato",
        "Data Iscrizione",
        "Data Completamento"
    ]

    const rows = result.data.map(row => [
        row.userName,
        row.userEmail || "",
        row.userDepartment || "",
        row.courseTitle,
        row.timeSpent.toString(),
        row.minimumDuration.toString(),
        (row.timeSpent / 60).toFixed(2),
        (row.minimumDuration / 60).toFixed(2),
        row.progress.toFixed(0),
        row.status,
        new Date(row.enrolledAt).toLocaleDateString("it-IT"),
        row.completedAt ? new Date(row.completedAt).toLocaleDateString("it-IT") : ""
    ])

    const csv = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    return { success: true, csv }
}

export async function exportEngagementCSV() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    const result = await getEngagementReport()
    if (!result.success || !result.data) {
        return { success: false, error: result.error }
    }

    const data = result.data

    // Generate multiple CSV sections
    let csv = ""

    // Section 1: Overview
    csv += "=== PANORAMICA ENGAGEMENT ===\n"
    csv += "Metrica,Valore\n"
    csv += `Utenti Totali,${data.overview.totalUsers}\n`
    csv += `Utenti Attivi (7gg),${data.overview.activeUsersLast7Days}\n`
    csv += `Utenti Attivi (30gg),${data.overview.activeUsersLast30Days}\n`
    csv += `Iscrizioni Totali,${data.overview.totalEnrollments}\n`
    csv += `Iscrizioni Completate,${data.overview.completedEnrollments}\n`
    csv += `Tasso Completamento,${data.overview.completionRate.toFixed(1)}%\n`
    csv += `Tempo Studio Totale (min),${data.overview.totalStudyTimeMinutes}\n`
    csv += `Tempo Medio per Utente (min),${data.overview.avgStudyTimePerUser.toFixed(1)}\n`
    csv += `Iscrizioni Sincronizzate TMS,${data.overview.tmsSyncedEnrollments}\n`
    csv += `Utenti Inattivi (30+ gg),${data.inactiveUsersCount}\n`
    csv += "\n"

    // Section 2: Quiz Stats
    csv += "=== STATISTICHE QUIZ ===\n"
    csv += "Metrica,Valore\n"
    csv += `Tentativi Totali,${data.quizStats.totalAttempts}\n`
    csv += `Quiz Superati,${data.quizStats.passedAttempts}\n`
    csv += `Tasso Superamento,${data.quizStats.passRate.toFixed(1)}%\n`
    csv += `Punteggio Medio,${data.quizStats.avgScore.toFixed(1)}%\n`
    csv += "\n"

    // Section 3: Top Courses
    csv += "=== TOP 10 CORSI ===\n"
    csv += "Posizione,Corso,Iscrizioni,Completamenti,Tasso Completamento,Tempo Totale (min),Tempo Medio (min)\n"
    data.topCourses.forEach((course, index) => {
        const completionRate = course.enrollments > 0
            ? ((course.completions / course.enrollments) * 100).toFixed(1)
            : "0"
        csv += `${index + 1},"${course.courseTitle}",${course.enrollments},${course.completions},${completionRate}%,${course.totalTime},${course.avgTime.toFixed(1)}\n`
    })
    csv += "\n"

    // Section 4: Top Users
    csv += "=== TOP 10 UTENTI ===\n"
    csv += "Posizione,Utente,Email,Dipartimento,Tempo Studio (min),Moduli Completati,Quiz Superati,Ultima Attività\n"
    data.topUsers.forEach((user, index) => {
        const lastActivity = user.lastActivity
            ? new Date(user.lastActivity).toLocaleDateString("it-IT")
            : "N/A"
        csv += `${index + 1},"${user.userName}","${user.userEmail || ""}","${user.department || ""}",${user.studyTime},${user.modulesCompleted},${user.quizzesPassed},"${lastActivity}"\n`
    })

    return { success: true, csv }
}

// ============================================
// MODULE-LEVEL TIME TRACKING REPORTS
// ============================================

export async function getModuleTimeTrackingReport(filters?: {
    userId?: string
    courseId?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        // Build where clause for enrollments
        const enrollmentWhere: Prisma.EnrollmentWhereInput = {}
        if (filters?.userId) enrollmentWhere.userId = filters.userId
        if (filters?.courseId) enrollmentWhere.courseId = filters.courseId

        // Get all module progress with related data
        const moduleProgressData = await db.moduleProgress.findMany({
            where: filters?.userId ? { userId: filters.userId } : undefined,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: {
                            select: { name: true }
                        }
                    }
                },
                module: {
                    select: {
                        id: true,
                        title: true,
                        position: true,
                        minimumDuration: true,
                        contentType: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { module: { course: { title: "asc" } } },
                { module: { position: "asc" } }
            ]
        })

        // Filter by courseId if specified
        let filteredData = moduleProgressData
        if (filters?.courseId) {
            filteredData = moduleProgressData.filter(
                mp => mp.module.course.id === filters.courseId
            )
        }

        const reportData = filteredData.map(mp => ({
            moduleProgressId: mp.id,
            userId: mp.user.id,
            userName: mp.user.name || mp.user.email || "N/A",
            userEmail: mp.user.email,
            userDepartment: mp.user.department?.name || null,
            courseId: mp.module.course.id,
            courseTitle: mp.module.course.title,
            moduleId: mp.module.id,
            moduleTitle: mp.module.title,
            modulePosition: mp.module.position,
            contentType: mp.module.contentType || "VIDEO",
            timeSpent: mp.timeSpent, // in seconds
            watchedSeconds: mp.watchedSeconds,
            minimumDuration: mp.module.minimumDuration || 0, // in minutes
            completed: mp.completed,
            completedAt: mp.completedAt,
            lastActivity: mp.updatedAt,
            status: mp.completed
                ? "Completato"
                : mp.module.minimumDuration && mp.module.minimumDuration > 0 && mp.timeSpent >= (mp.module.minimumDuration * 60)
                    ? "Tempo OK - In Corso"
                    : mp.module.minimumDuration && mp.module.minimumDuration > 0
                        ? "Tempo Insufficiente"
                        : "In Corso"
        }))

        return { success: true, data: reportData }
    } catch (error) {
        console.error("Error fetching module time tracking report:", error)
        return { success: false, error: "Errore durante il recupero dei dati" }
    }
}

export async function exportModuleTimeTrackingCSV(filters?: {
    userId?: string
    courseId?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    const result = await getModuleTimeTrackingReport(filters)
    if (!result.success || !result.data) {
        return { success: false, error: result.error }
    }

    const headers = [
        "Utente",
        "Email",
        "Dipartimento",
        "Corso",
        "Modulo",
        "Posizione",
        "Tipo Contenuto",
        "Tempo Trascorso (sec)",
        "Tempo Trascorso (min)",
        "Tempo Richiesto (min)",
        "Stato",
        "Completato",
        "Data Completamento",
        "Ultima Attività"
    ]

    const rows = result.data.map(row => [
        row.userName,
        row.userEmail || "",
        row.userDepartment || "",
        row.courseTitle,
        row.moduleTitle,
        row.modulePosition.toString(),
        row.contentType,
        row.timeSpent.toString(),
        Math.floor(row.timeSpent / 60).toString(),
        row.minimumDuration.toString(),
        row.status,
        row.completed ? "Sì" : "No",
        row.completedAt ? new Date(row.completedAt).toLocaleDateString("it-IT") : "",
        new Date(row.lastActivity).toLocaleDateString("it-IT")
    ])

    const csv = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    return { success: true, csv }
}

// User's personal module time analytics
export async function getUserModuleTimeAnalytics() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const userId = session.user.id

        // Get user's enrollments with courses
        const enrollments = await db.enrollment.findMany({
            where: { userId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        minimumDuration: true,
                        modules: {
                            where: effectivelyPublishedModuleWhere(),
                            select: {
                                id: true,
                                title: true,
                                position: true,
                                minimumDuration: true,
                                contentType: true
                            },
                            orderBy: { position: "asc" }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        // Get all module progress for this user
        const moduleProgress = await db.moduleProgress.findMany({
            where: { userId },
            select: {
                moduleId: true,
                timeSpent: true,
                watchedSeconds: true,
                completed: true,
                completedAt: true,
                updatedAt: true
            }
        })

        // Create a map for quick lookup
        const progressMap = new Map(
            moduleProgress.map(mp => [mp.moduleId, mp])
        )

        // Build the analytics data
        const courseAnalytics = enrollments.map(enrollment => {
            const courseModules = enrollment.course.modules.map(module => {
                const progress = progressMap.get(module.id)
                const timeSpent = progress?.timeSpent || 0
                const minimumDurationSec = (module.minimumDuration || 0) * 60

                return {
                    moduleId: module.id,
                    moduleTitle: module.title,
                    position: module.position,
                    contentType: module.contentType || "VIDEO",
                    timeSpent, // seconds
                    watchedSeconds: progress?.watchedSeconds || 0,
                    minimumDuration: module.minimumDuration || 0, // minutes
                    completed: progress?.completed || false,
                    completedAt: progress?.completedAt ?? null,
                    lastActivity: progress?.updatedAt ?? null,
                    timePercentage: minimumDurationSec > 0
                        ? Math.min(Math.round((timeSpent / minimumDurationSec) * 100), 100)
                        : 100
                }
            })

            const totalTimeSpent = courseModules.reduce((sum, m) => sum + m.timeSpent, 0)
            const completedModules = courseModules.filter(m => m.completed).length
            const totalModules = courseModules.length

            return {
                courseId: enrollment.course.id,
                courseTitle: enrollment.course.title,
                courseMinimumDuration: enrollment.course.minimumDuration,
                enrollmentTimeSpent: enrollment.timeSpent,
                enrollmentProgress: enrollment.progress,
                enrollmentCompleted: enrollment.completed,
                totalTimeSpent,
                completedModules,
                totalModules,
                modules: courseModules
            }
        })

        // Calculate totals
        const totalStudyTime = courseAnalytics.reduce((sum, c) => sum + c.totalTimeSpent, 0)
        const totalCompletedModules = courseAnalytics.reduce((sum, c) => sum + c.completedModules, 0)
        const totalModules = courseAnalytics.reduce((sum, c) => sum + c.totalModules, 0)
        const completedCourses = courseAnalytics.filter(c => c.enrollmentCompleted).length

        return {
            success: true,
            data: {
                summary: {
                    totalStudyTime, // seconds
                    totalCompletedModules,
                    totalModules,
                    totalCourses: enrollments.length,
                    completedCourses
                },
                courses: courseAnalytics
            }
        }
    } catch (error) {
        console.error("Error fetching user module time analytics:", error)
        return { success: false, error: "Errore durante il recupero dei dati" }
    }
}
