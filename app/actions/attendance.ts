"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { awardPoints } from "@/lib/gamification"
import { AttendanceStatus } from "@prisma/client"

// ============ USER ACTIONS ============

/**
 * Register current user for a session
 */
export async function registerForSession(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Non autenticato" }
    }

    try {
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId },
            include: { attendance: true }
        })

        if (!liveSession) {
            return { success: false, error: "Sessione non trovata" }
        }

        // Check max participants
        if (liveSession.maxParticipants) {
            const registeredCount = liveSession.attendance.length
            if (registeredCount >= liveSession.maxParticipants) {
                return { success: false, error: "Sessione al completo" }
            }
        }

        // Check if already registered
        const existing = await db.sessionAttendance.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: session.user.id
                }
            }
        })

        if (existing) {
            return { success: false, error: "Già registrato a questa sessione" }
        }

        await db.sessionAttendance.create({
            data: {
                sessionId,
                userId: session.user.id,
                status: "REGISTERED"
            }
        })

        revalidatePath(`/live-sessions`)
        revalidatePath(`/dashboard`)

        return { success: true }
    } catch (error) {
        console.error("Error registering for session:", error)
        return { success: false, error: "Errore durante la registrazione" }
    }
}

/**
 * User self check-in (allowed 15 min before session start)
 */
export async function selfCheckIn(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Non autenticato" }
    }

    try {
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId }
        })

        if (!liveSession) {
            return { success: false, error: "Sessione non trovata" }
        }

        if (!liveSession.startTime) {
            return { success: false, error: "Orario di inizio sessione non impostato" }
        }

        const now = new Date()
        const sessionStart = new Date(liveSession.startTime)
        const checkInWindow = new Date(sessionStart.getTime() - 15 * 60 * 1000) // 15 min before

        if (now < checkInWindow) {
            return { success: false, error: "Check-in disponibile 15 minuti prima dell'inizio" }
        }

        if (liveSession.endTime && now > liveSession.endTime) {
            return { success: false, error: "Sessione terminata" }
        }

        // Determine status based on arrival time
        const isLate = now > sessionStart
        const status: AttendanceStatus = isLate ? "LATE" : "PRESENT"

        const attendance = await db.sessionAttendance.upsert({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: session.user.id
                }
            },
            create: {
                sessionId,
                userId: session.user.id,
                status,
                checkInTime: now
            },
            update: {
                status,
                checkInTime: now
            }
        })

        // Award points for check-in
        await awardPoints(session.user.id, 25, `SESSION_CHECKIN_${sessionId}`)

        revalidatePath(`/live-sessions`)
        revalidatePath(`/dashboard`)

        return { success: true, attendance, isLate }
    } catch (error) {
        console.error("Error checking in:", error)
        return { success: false, error: "Errore durante il check-in" }
    }
}

/**
 * User self check-out with duration calculation
 */
export async function selfCheckOut(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Non autenticato" }
    }

    try {
        const attendance = await db.sessionAttendance.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: session.user.id
                }
            }
        })

        if (!attendance) {
            return { success: false, error: "Non registrato a questa sessione" }
        }

        if (!attendance.checkInTime) {
            return { success: false, error: "Check-in non effettuato" }
        }

        const now = new Date()
        const durationMinutes = Math.round(
            (now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60)
        )

        const updated = await db.sessionAttendance.update({
            where: { id: attendance.id },
            data: {
                status: "ATTENDED",
                checkOutTime: now,
                durationMinutes
            }
        })

        // Award points for completion (if stayed at least 30 min)
        if (durationMinutes >= 30) {
            await awardPoints(session.user.id, 50, `SESSION_COMPLETED_${sessionId}`)
        }

        revalidatePath(`/live-sessions`)
        revalidatePath(`/dashboard`)

        return { success: true, attendance: updated, durationMinutes }
    } catch (error) {
        console.error("Error checking out:", error)
        return { success: false, error: "Errore durante il check-out" }
    }
}

/**
 * Get user's attendance for a session
 */
export async function getMyAttendance(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    return db.sessionAttendance.findUnique({
        where: {
            sessionId_userId: {
                sessionId,
                userId: session.user.id
            }
        }
    })
}

// ============ ADMIN ACTIONS ============

/**
 * Admin check-in for a user
 */
export async function adminCheckIn(sessionId: string, userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const now = new Date()

        const attendance = await db.sessionAttendance.upsert({
            where: {
                sessionId_userId: { sessionId, userId }
            },
            create: {
                sessionId,
                userId,
                status: "PRESENT",
                checkInTime: now
            },
            update: {
                status: "PRESENT",
                checkInTime: now
            }
        })

        revalidatePath(`/admin/live-sessions/${sessionId}/attendance`)

        return { success: true, attendance }
    } catch (error) {
        console.error("Error admin check-in:", error)
        return { success: false, error: "Errore durante il check-in" }
    }
}

/**
 * Admin check-out for a user
 */
export async function adminCheckOut(sessionId: string, userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const attendance = await db.sessionAttendance.findUnique({
            where: {
                sessionId_userId: { sessionId, userId }
            }
        })

        if (!attendance) {
            return { success: false, error: "Presenza non trovata" }
        }

        const now = new Date()
        const durationMinutes = attendance.checkInTime
            ? Math.round((now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60))
            : null

        const updated = await db.sessionAttendance.update({
            where: { id: attendance.id },
            data: {
                status: "ATTENDED",
                checkOutTime: now,
                durationMinutes
            }
        })

        revalidatePath(`/admin/live-sessions/${sessionId}/attendance`)

        return { success: true, attendance: updated }
    } catch (error) {
        console.error("Error admin check-out:", error)
        return { success: false, error: "Errore durante il check-out" }
    }
}

/**
 * Bulk update attendance status
 */
export async function bulkUpdateAttendance(
    sessionId: string,
    userIds: string[],
    status: AttendanceStatus
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        await db.sessionAttendance.updateMany({
            where: {
                sessionId,
                userId: { in: userIds }
            },
            data: { status }
        })

        revalidatePath(`/admin/live-sessions/${sessionId}/attendance`)

        return { success: true, updated: userIds.length }
    } catch (error) {
        console.error("Error bulk update:", error)
        return { success: false, error: "Errore durante l'aggiornamento" }
    }
}

/**
 * Mark absent users after session ends (30 min grace period)
 */
export async function markAbsentUsers(sessionId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId }
        })

        if (!liveSession) {
            return { success: false, error: "Sessione non trovata" }
        }

        if (!liveSession.endTime) {
            return { success: false, error: "Orario di fine sessione non impostato" }
        }

        const now = new Date()
        const graceEnd = new Date(liveSession.endTime.getTime() + 30 * 60 * 1000)

        if (now < graceEnd) {
            return { success: false, error: "Attendere 30 minuti dopo la fine della sessione" }
        }

        const result = await db.sessionAttendance.updateMany({
            where: {
                sessionId,
                status: "REGISTERED"
            },
            data: { status: "ABSENT" }
        })

        revalidatePath(`/admin/live-sessions/${sessionId}/attendance`)

        return { success: true, marked: result.count }
    } catch (error) {
        console.error("Error marking absent:", error)
        return { success: false, error: "Errore durante l'aggiornamento" }
    }
}

/**
 * Update single attendance status
 */
export async function updateAttendanceStatus(
    attendanceId: string,
    status: AttendanceStatus,
    notes?: string
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const attendance = await db.sessionAttendance.update({
            where: { id: attendanceId },
            data: { status, notes }
        })

        revalidatePath(`/admin/live-sessions/${attendance.sessionId}/attendance`)

        return { success: true, attendance }
    } catch (error) {
        console.error("Error updating attendance:", error)
        return { success: false, error: "Errore durante l'aggiornamento" }
    }
}

/**
 * Get session attendance with stats
 */
export async function getSessionAttendance(sessionId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return null
    }

    const liveSession = await db.liveSession.findUnique({
        where: { id: sessionId },
        include: {
            attendance: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            department: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: "asc" }
            },
            instructor: { select: { id: true, name: true, email: true } },
            course: { select: { title: true } },
            physicalRoom: true
        }
    })

    if (!liveSession) return null

    // Separate student attendance from instructor attendance for stats
    const studentAttendance = liveSession.attendance.filter(
        a => a.user.id !== liveSession.instructorId
    )

    // Calculate stats (only students, not instructors)
    const stats = {
        total: studentAttendance.length,
        registered: studentAttendance.filter(a => a.status === "REGISTERED").length,
        present: studentAttendance.filter(a => a.status === "PRESENT").length,
        attended: studentAttendance.filter(a => a.status === "ATTENDED").length,
        absent: studentAttendance.filter(a => a.status === "ABSENT").length,
        late: studentAttendance.filter(a => a.status === "LATE").length,
        excused: studentAttendance.filter(a => a.status === "EXCUSED").length,
        averageDuration: 0
    }

    const durationsWithValues = studentAttendance
        .filter(a => a.durationMinutes !== null)
        .map(a => a.durationMinutes!)

    if (durationsWithValues.length > 0) {
        stats.averageDuration = Math.round(
            durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length
        )
    }

    return { session: liveSession, stats }
}

/**
 * Export attendance to CSV
 */
export async function exportAttendanceCSV(sessionId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const data = await getSessionAttendance(sessionId)
        if (!data) {
            return { success: false, error: "Sessione non trovata" }
        }

        const headers = [
            "Nome",
            "Email",
            "Dipartimento",
            "Stato",
            "Check-in",
            "Check-out",
            "Durata (min)",
            "Note"
        ]

        const rows = data.session.attendance.map(a => [
            a.user.name || "",
            a.user.email,
            a.user.department?.name || "",
            a.status,
            a.checkInTime ? new Date(a.checkInTime).toLocaleString("it-IT") : "",
            a.checkOutTime ? new Date(a.checkOutTime).toLocaleString("it-IT") : "",
            a.durationMinutes?.toString() || "",
            a.notes || ""
        ])

        const csv = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n")

        return { success: true, csv, filename: `presenze-${sessionId}.csv` }
    } catch (error) {
        console.error("Error exporting CSV:", error)
        return { success: false, error: "Errore durante l'export" }
    }
}

/**
 * Sync attendance from Google Meet participants
 */
export async function syncGoogleMeetAttendance(
    sessionId: string,
    participantEmails: string[]
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        // Find users by email
        const users = await db.user.findMany({
            where: {
                email: { in: participantEmails }
            },
            select: { id: true, email: true }
        })

        const now = new Date()
        let synced = 0

        for (const user of users) {
            await db.sessionAttendance.upsert({
                where: {
                    sessionId_userId: { sessionId, userId: user.id }
                },
                create: {
                    sessionId,
                    userId: user.id,
                    status: "ATTENDED",
                    checkInTime: now,
                    checkOutTime: now,
                    notes: "Sincronizzato da Google Meet"
                },
                update: {
                    status: "ATTENDED",
                    notes: "Sincronizzato da Google Meet"
                }
            })
            synced++
        }

        revalidatePath(`/admin/live-sessions/${sessionId}/attendance`)

        return {
            success: true,
            synced,
            notFound: participantEmails.length - synced
        }
    } catch (error) {
        console.error("Error syncing from Google Meet:", error)
        return { success: false, error: "Errore durante la sincronizzazione" }
    }
}
