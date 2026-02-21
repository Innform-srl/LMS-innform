import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AttendanceStatus } from "@prisma/client"

/**
 * GET /api/sessions/[sessionId]/attendance
 * Get attendance list for a session (admin only)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { sessionId } = await params

    // Users can only see their own attendance
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
        const attendance = await db.sessionAttendance.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: session.user.id
                }
            }
        })
        return NextResponse.json({ attendance })
    }

    // Admin gets full list with stats
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
                            department: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: "asc" }
            }
        }
    })

    if (!liveSession) {
        return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    const stats = {
        total: liveSession.attendance.length,
        registered: liveSession.attendance.filter(a => a.status === "REGISTERED").length,
        present: liveSession.attendance.filter(a => a.status === "PRESENT").length,
        attended: liveSession.attendance.filter(a => a.status === "ATTENDED").length,
        absent: liveSession.attendance.filter(a => a.status === "ABSENT").length,
        late: liveSession.attendance.filter(a => a.status === "LATE").length,
        excused: liveSession.attendance.filter(a => a.status === "EXCUSED").length
    }

    return NextResponse.json({
        attendance: liveSession.attendance,
        stats
    })
}

/**
 * POST /api/sessions/[sessionId]/attendance
 * Register for session or check-in
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { action, userId } = body

    // Admin can check-in other users
    if (action === "admin_checkin" && (session.user.role === "ADMIN" || session.user.role === "TEACHER") && userId) {
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
        return NextResponse.json({ success: true, attendance })
    }

    // User self-registration
    if (action === "register") {
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId },
            include: { attendance: true }
        })

        if (!liveSession) {
            return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
        }

        if (liveSession.maxParticipants) {
            if (liveSession.attendance.length >= liveSession.maxParticipants) {
                return NextResponse.json({ error: "Sessione al completo" }, { status: 400 })
            }
        }

        const attendance = await db.sessionAttendance.create({
            data: {
                sessionId,
                userId: session.user.id,
                status: "REGISTERED"
            }
        })

        return NextResponse.json({ success: true, attendance })
    }

    // User self check-in
    if (action === "checkin") {
        const liveSession = await db.liveSession.findUnique({
            where: { id: sessionId }
        })

        if (!liveSession) {
            return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
        }

        const now = new Date()
        const sessionStart = new Date(liveSession.startTime)
        const checkInWindow = new Date(sessionStart.getTime() - 15 * 60 * 1000)

        if (now < checkInWindow) {
            return NextResponse.json(
                { error: "Check-in disponibile 15 minuti prima dell'inizio" },
                { status: 400 }
            )
        }

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

        return NextResponse.json({ success: true, attendance, isLate })
    }

    // User self check-out
    if (action === "checkout") {
        const attendance = await db.sessionAttendance.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: session.user.id
                }
            }
        })

        if (!attendance?.checkInTime) {
            return NextResponse.json(
                { error: "Check-in non effettuato" },
                { status: 400 }
            )
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

        return NextResponse.json({ success: true, attendance: updated, durationMinutes })
    }

    return NextResponse.json({ error: "Azione non valida" }, { status: 400 })
}

/**
 * PATCH /api/sessions/[sessionId]/attendance
 * Update attendance status (admin only)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { attendanceId, userId, status, notes, bulk, userIds } = body

    // Bulk update
    if (bulk && userIds?.length) {
        await db.sessionAttendance.updateMany({
            where: {
                sessionId,
                userId: { in: userIds }
            },
            data: { status }
        })
        return NextResponse.json({ success: true, updated: userIds.length })
    }

    // Single update by attendanceId
    if (attendanceId) {
        const attendance = await db.sessionAttendance.update({
            where: { id: attendanceId },
            data: { status, notes }
        })
        return NextResponse.json({ success: true, attendance })
    }

    // Single update by userId
    if (userId) {
        const attendance = await db.sessionAttendance.update({
            where: {
                sessionId_userId: { sessionId, userId }
            },
            data: { status, notes }
        })
        return NextResponse.json({ success: true, attendance })
    }

    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
}
