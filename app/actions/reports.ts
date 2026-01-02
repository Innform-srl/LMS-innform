"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function getTimeTrackingReport() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const enrollments = await db.enrollment.findMany({
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
            orderBy: { createdAt: "desc" }
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

        return { success: true, data: reportData }
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

        // Get all enrollments with user and course data
        const enrollments = await db.enrollment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        createdAt: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        minimumDuration: true
                    }
                }
            }
        })

        // Get quiz attempts
        const quizAttempts = await db.quizAttempt.findMany({
            select: {
                id: true,
                userId: true,
                score: true,
                passed: true,
                completedAt: true,
                quiz: {
                    select: {
                        passingScore: true
                    }
                }
            }
        })

        // Get module progress
        const moduleProgress = await db.moduleProgress.findMany({
            select: {
                userId: true,
                moduleId: true,
                // @ts-ignore
                timeSpent: true,
                completed: true,
                completedAt: true,
                updatedAt: true
            }
        })

        // Calculate metrics
        const totalUsers = new Set(enrollments.map(e => e.userId)).size
        const activeUsersLast7Days = new Set(
            moduleProgress
                .filter(mp => mp.updatedAt && mp.updatedAt >= sevenDaysAgo)
                .map(mp => mp.userId)
        ).size
        const activeUsersLast30Days = new Set(
            moduleProgress
                .filter(mp => mp.updatedAt && mp.updatedAt >= thirtyDaysAgo)
                .map(mp => mp.userId)
        ).size

        // Total study time
        const totalStudyTimeMinutes = enrollments.reduce((acc, e) => acc + (e.timeSpent || 0), 0)
        const avgStudyTimePerUser = totalUsers > 0 ? totalStudyTimeMinutes / totalUsers : 0

        // Completion rates
        const totalEnrollments = enrollments.length
        const completedEnrollments = enrollments.filter(e => e.completed).length
        const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0

        // Quiz stats
        const totalQuizAttempts = quizAttempts.length
        const passedQuizAttempts = quizAttempts.filter(q => q.passed).length
        const quizPassRate = totalQuizAttempts > 0 ? (passedQuizAttempts / totalQuizAttempts) * 100 : 0
        const avgQuizScore = totalQuizAttempts > 0
            ? quizAttempts.reduce((acc, q) => acc + q.score, 0) / totalQuizAttempts
            : 0

        // Courses by engagement
        const courseEngagement = new Map<string, {
            courseId: string,
            courseTitle: string,
            enrollments: number,
            completions: number,
            totalTime: number,
            avgTime: number
        }>()

        enrollments.forEach(e => {
            const existing = courseEngagement.get(e.courseId)
            if (existing) {
                existing.enrollments++
                if (e.completed) existing.completions++
                existing.totalTime += e.timeSpent || 0
                existing.avgTime = existing.totalTime / existing.enrollments
            } else {
                courseEngagement.set(e.courseId, {
                    courseId: e.courseId,
                    courseTitle: e.course.title,
                    enrollments: 1,
                    completions: e.completed ? 1 : 0,
                    totalTime: e.timeSpent || 0,
                    avgTime: e.timeSpent || 0
                })
            }
        })

        const topCourses = Array.from(courseEngagement.values())
            .sort((a, b) => b.enrollments - a.enrollments)
            .slice(0, 10)

        // Users by activity (last 30 days)
        const userActivity = new Map<string, {
            userId: string,
            userName: string,
            userEmail: string | null,
            department: string | null,
            studyTime: number,
            modulesCompleted: number,
            quizzesPassed: number,
            lastActivity: Date | null
        }>()

        enrollments.forEach(e => {
            const existing = userActivity.get(e.userId)
            if (existing) {
                existing.studyTime += e.timeSpent || 0
            } else {
                userActivity.set(e.userId, {
                    userId: e.userId,
                    userName: e.user.name || e.user.email || "N/A",
                    userEmail: e.user.email,
                    // @ts-ignore
                    department: e.user.department?.name || null,
                    studyTime: e.timeSpent || 0,
                    modulesCompleted: 0,
                    quizzesPassed: 0,
                    lastActivity: null
                })
            }
        })

        moduleProgress.forEach(mp => {
            const user = userActivity.get(mp.userId)
            if (user) {
                if (mp.completed) user.modulesCompleted++
                if (!user.lastActivity || (mp.updatedAt && mp.updatedAt > user.lastActivity)) {
                    user.lastActivity = mp.updatedAt
                }
            }
        })

        quizAttempts.forEach(qa => {
            const user = userActivity.get(qa.userId)
            if (user && qa.passed) {
                user.quizzesPassed++
            }
        })

        const topUsers = Array.from(userActivity.values())
            .sort((a, b) => b.studyTime - a.studyTime)
            .slice(0, 10)

        // Inactive users (no activity in 30 days)
        const inactiveUsers = Array.from(userActivity.values())
            .filter(u => !u.lastActivity || u.lastActivity < thirtyDaysAgo)

        // TMS sync stats
        // @ts-ignore
        const tmsSyncedEnrollments = enrollments.filter(e => e.tmsEnrollmentId).length

        return {
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeUsersLast7Days,
                    activeUsersLast30Days,
                    totalEnrollments,
                    completedEnrollments,
                    completionRate,
                    totalStudyTimeMinutes,
                    avgStudyTimePerUser,
                    tmsSyncedEnrollments
                },
                quizStats: {
                    totalAttempts: totalQuizAttempts,
                    passedAttempts: passedQuizAttempts,
                    passRate: quizPassRate,
                    avgScore: avgQuizScore
                },
                topCourses,
                topUsers,
                inactiveUsersCount: inactiveUsers.length
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
