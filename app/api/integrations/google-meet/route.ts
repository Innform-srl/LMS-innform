import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * GET /api/integrations/google-meet
 * Get Google Meet sync status for a session
 */
export async function GET(request: NextRequest) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
        return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    const liveSession = await db.liveSession.findUnique({
        where: { id: sessionId },
        select: {
            id: true,
            title: true,
            meetingUrl: true,
            googleMeetCode: true,
            attendance: {
                where: { notes: { contains: "Google Meet" } },
                select: { id: true }
            }
        }
    })

    if (!liveSession) {
        return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    return NextResponse.json({
        session: liveSession,
        syncedCount: liveSession.attendance.length,
        hasGoogleMeetCode: !!liveSession.googleMeetCode
    })
}

/**
 * POST /api/integrations/google-meet
 * Sync participants from Google Meet
 * Supports 3 methods:
 * 1. Email list (manual paste)
 * 2. CSV import (from Google Admin Console)
 * 3. Auto sync (requires Google Workspace service account - not implemented)
 */
export async function POST(request: NextRequest) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, method, emails, csvData } = body

    if (!sessionId) {
        return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    const liveSession = await db.liveSession.findUnique({
        where: { id: sessionId }
    })

    if (!liveSession) {
        return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    let participantEmails: string[] = []

    // Method 1: Email list
    if (method === "emails" && emails) {
        participantEmails = emails
            .split(/[\n,;]/)
            .map((e: string) => e.trim().toLowerCase())
            .filter((e: string) => e.includes("@"))
    }

    // Method 2: CSV import
    if (method === "csv" && csvData) {
        const lines = csvData.split("\n")
        for (const line of lines) {
            const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
            if (emailMatch) {
                participantEmails.push(emailMatch[0].toLowerCase())
            }
        }
    }

    // Method 3: Auto sync (placeholder for future implementation)
    if (method === "auto") {
        return NextResponse.json(
            { error: "Auto sync richiede configurazione Google Workspace" },
            { status: 501 }
        )
    }

    if (participantEmails.length === 0) {
        return NextResponse.json(
            { error: "Nessuna email valida trovata" },
            { status: 400 }
        )
    }

    // Remove duplicates
    participantEmails = [...new Set(participantEmails)]

    // Find matching users
    const users = await db.user.findMany({
        where: {
            email: { in: participantEmails }
        },
        select: { id: true, email: true }
    })

    const now = new Date()
    let synced = 0
    const notFoundEmails: string[] = []

    // Track found emails
    const foundEmails = new Set(users.map(u => u.email.toLowerCase()))

    // Find emails not in system
    for (const email of participantEmails) {
        if (!foundEmails.has(email)) {
            notFoundEmails.push(email)
        }
    }

    // Upsert attendance for found users
    for (const user of users) {
        await db.sessionAttendance.upsert({
            where: {
                sessionId_userId: { sessionId, userId: user.id }
            },
            create: {
                sessionId,
                userId: user.id,
                status: "ATTENDED",
                checkInTime: liveSession.startTime,
                checkOutTime: liveSession.endTime,
                durationMinutes: Math.round(
                    (liveSession.endTime.getTime() - liveSession.startTime.getTime()) / (1000 * 60)
                ),
                notes: "Sincronizzato da Google Meet"
            },
            update: {
                status: "ATTENDED",
                notes: "Sincronizzato da Google Meet"
            }
        })
        synced++
    }

    return NextResponse.json({
        success: true,
        synced,
        notFound: notFoundEmails.length,
        notFoundEmails: notFoundEmails.slice(0, 10), // Return first 10 for display
        totalProcessed: participantEmails.length
    })
}

/**
 * PUT /api/integrations/google-meet
 * Update Google Meet code for a session
 */
export async function PUT(request: NextRequest) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, googleMeetCode } = body

    if (!sessionId) {
        return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
    }

    // Extract meeting code from URL if full URL provided
    let code = googleMeetCode
    if (code?.includes("meet.google.com/")) {
        const match = code.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/)
        if (match) {
            code = match[1]
        }
    }

    const updated = await db.liveSession.update({
        where: { id: sessionId },
        data: { googleMeetCode: code }
    })

    return NextResponse.json({
        success: true,
        googleMeetCode: updated.googleMeetCode
    })
}
