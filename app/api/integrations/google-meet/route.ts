import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  getGoogleOAuthUrl,
  getAllConferencesByMeetingCode,
  getConferenceParticipants,
  extractEmail,
  type MeetParticipant
} from "@/lib/google-meet-api"
import { getValidAccessToken, isGoogleMeetConnected, disconnectGoogleMeet } from "@/lib/google-meet-tokens"

/**
 * GET /api/integrations/google-meet
 * Get Google Meet sync status for a session + stato connessione OAuth
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const action = searchParams.get("action")

  // Controlla solo lo stato della connessione OAuth
  if (action === "status") {
    const connected = await isGoogleMeetConnected()
    const authUrl = getGoogleOAuthUrl()
    return NextResponse.json({ connected, authUrl })
  }

  // Ritorna lista utenti per associazione manuale partecipanti anonimi
  if (action === "users") {
    const users = await db.user.findMany({
      where: { isApproved: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500
    })
    return NextResponse.json({ users })
  }

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

  const connected = await isGoogleMeetConnected()
  const authUrl = getGoogleOAuthUrl(sessionId)

  return NextResponse.json({
    session: liveSession,
    syncedCount: liveSession.attendance.length,
    hasGoogleMeetCode: !!liveSession.googleMeetCode,
    googleMeetConnected: connected,
    authUrl
  })
}

/**
 * POST /api/integrations/google-meet
 * Sync participants from Google Meet
 * Metodi: emails (manuale), csv (import), auto (API Google Meet)
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
  let conferenceEnd: string | null = null
  const meetParticipantsData: Array<{
    email: string
    displayName: string
    checkInTime: Date
    checkOutTime: Date
    durationMinutes: number
    sessionCount: number
    sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>
    participantType: "google" | "anonymous" | "phone"
  }> = []
  const unmatchedParticipants: Array<{
    displayName: string
    checkInTime: string
    checkOutTime: string | null
    durationMinutes: number
    sessionCount: number
    sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>
    participantType: "google" | "anonymous" | "phone"
  }> = []

  // ── METHOD: AUTO (Google Meet REST API v2) ────────────────────────────────
  if (method === "auto") {
    if (!liveSession.googleMeetCode) {
      return NextResponse.json(
        { error: "Nessun Google Meet code associato a questa sessione" },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      const authUrl = getGoogleOAuthUrl(sessionId)
      return NextResponse.json(
        {
          error: "Google Meet non connesso",
          requiresAuth: true,
          authUrl
        },
        { status: 401 }
      )
    }

    try {
      // Trova TUTTI i conferenceRecord dal meetingCode (possono essere più di uno se il meeting è stato riavviato)
      const allConferencesRaw = await getAllConferencesByMeetingCode(accessToken, liveSession.googleMeetCode)
      if (allConferencesRaw.length === 0) {
        return NextResponse.json(
          { error: `Nessuna conferenza trovata per il codice ${liveSession.googleMeetCode}. La sessione è già terminata?` },
          { status: 404 }
        )
      }

      // Filtra solo i conference records che si sovrappongono con il giorno della sessione
      // Usa un range con margine di 2 ore prima/dopo per gestire anticipi e ritardi
      const sessionStart = liveSession.startTime
        ? new Date(liveSession.startTime.getTime() - 2 * 60 * 60 * 1000)
        : null
      const sessionEnd = liveSession.endTime
        ? new Date(liveSession.endTime.getTime() + 2 * 60 * 60 * 1000)
        : null

      const allConferences = allConferencesRaw.filter(conf => {
        const confStart = new Date(conf.startTime)
        // Il conference deve iniziare entro il range della sessione
        if (sessionStart && confStart < sessionStart) return false
        if (sessionEnd && confStart > sessionEnd) return false
        return true
      })

      if (allConferences.length === 0) {
        return NextResponse.json(
          { error: `Nessuna conferenza trovata per il codice ${liveSession.googleMeetCode} nel giorno della sessione. Trovati ${allConferencesRaw.length} record in altre date.` },
          { status: 404 }
        )
      }

      // Recupera i partecipanti da TUTTI i conference records e aggregali
      const allParticipantsMap = new Map<string, MeetParticipant>()

      for (const conference of allConferences) {
        const confEnd = conference.endTime ?? liveSession.endTime?.toISOString() ?? null
        const participants = await getConferenceParticipants(accessToken, conference.name, confEnd)

        for (const p of participants) {
          // Usa email o displayName come chiave per aggregare
          const key = (p.email || p.displayName || p.name).toLowerCase()
          const existing = allParticipantsMap.get(key)

          if (existing) {
            // Merge: combina le sessioni, deduplica sovrapposizioni, ricalcola durata
            const allSessions = [...existing.sessions, ...p.sessions]
            // Ordina per startTime e rimuovi sessioni duplicate/sovrapposte
            allSessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            const mergedSessions: typeof allSessions = []
            for (const s of allSessions) {
              const prev = mergedSessions[mergedSessions.length - 1]
              if (prev && prev.endTime && new Date(s.startTime) <= new Date(prev.endTime)) {
                // Sessione sovrapposta: estendi la precedente se necessario
                if (s.endTime && (!prev.endTime || new Date(s.endTime) > new Date(prev.endTime))) {
                  prev.endTime = s.endTime
                  prev.durationMinutes = Math.round(
                    (new Date(prev.endTime).getTime() - new Date(prev.startTime).getTime()) / (1000 * 60)
                  )
                }
              } else {
                mergedSessions.push({ ...s })
              }
            }
            existing.sessions = mergedSessions
            existing.totalDurationMinutes = mergedSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
            // Prendi il primo check-in e l'ultimo check-out
            if (new Date(p.earliestStartTime) < new Date(existing.earliestStartTime)) {
              existing.earliestStartTime = p.earliestStartTime
            }
            if (p.latestEndTime && (!existing.latestEndTime || new Date(p.latestEndTime) > new Date(existing.latestEndTime))) {
              existing.latestEndTime = p.latestEndTime
            }
          } else {
            allParticipantsMap.set(key, { ...p })
          }
        }
      }

      // Deduplica sessioni sovrapposte per TUTTI i partecipanti (anche quelli da singolo conference)
      const mergedParticipants = Array.from(allParticipantsMap.values()).map(p => {
        const sorted = [...p.sessions].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        const deduped: typeof sorted = []
        for (const s of sorted) {
          const prev = deduped[deduped.length - 1]
          if (prev && prev.endTime && new Date(s.startTime) <= new Date(prev.endTime)) {
            // Sessione sovrapposta o contenuta: estendi se necessario
            if (s.endTime && new Date(s.endTime) > new Date(prev.endTime)) {
              prev.endTime = s.endTime
              prev.durationMinutes = Math.round(
                (new Date(prev.endTime).getTime() - new Date(prev.startTime).getTime()) / (1000 * 60)
              )
            }
            // Altrimenti è completamente contenuta → ignora
          } else {
            deduped.push({ ...s })
          }
        }
        return {
          ...p,
          sessions: deduped,
          totalDurationMinutes: deduped.reduce((sum, s) => sum + s.durationMinutes, 0)
        }
      })

      // Usa l'ultimo conference per il conferenceEnd globale
      const lastConference = allConferences[allConferences.length - 1]
      conferenceEnd = lastConference.endTime ?? liveSession.endTime?.toISOString() ?? null

      for (const p of mergedParticipants) {
        const email = extractEmail(p.email)

        if (email) {
          const checkIn = new Date(p.earliestStartTime)
          const checkOut = p.latestEndTime ? new Date(p.latestEndTime) : (conferenceEnd ? new Date(conferenceEnd) : new Date())
          participantEmails.push(email)
          meetParticipantsData.push({
            email,
            displayName: p.displayName,
            checkInTime: checkIn,
            checkOutTime: checkOut > checkIn ? checkOut : (conferenceEnd ? new Date(conferenceEnd) : new Date()),
            durationMinutes: p.totalDurationMinutes,
            sessionCount: p.sessions.length,
            sessions: p.sessions,
            participantType: p.participantType
          })
        } else if (p.displayName && p.displayName !== "Anonimo") {
          const userByName = await db.user.findFirst({
            where: {
              OR: [
                { name: { equals: p.displayName, mode: "insensitive" } },
                { name: { contains: p.displayName, mode: "insensitive" } },
              ]
            },
            select: { id: true, email: true }
          })
          if (userByName) {
            const checkIn = new Date(p.earliestStartTime)
            const checkOut = p.latestEndTime ? new Date(p.latestEndTime) : (conferenceEnd ? new Date(conferenceEnd) : new Date())
            participantEmails.push(userByName.email.toLowerCase())
            meetParticipantsData.push({
              email: userByName.email.toLowerCase(),
              displayName: p.displayName,
              checkInTime: checkIn,
              checkOutTime: checkOut > checkIn ? checkOut : (conferenceEnd ? new Date(conferenceEnd) : new Date()),
              durationMinutes: p.totalDurationMinutes,
              sessionCount: p.sessions.length,
              sessions: p.sessions,
              participantType: p.participantType
            })
          } else {
            unmatchedParticipants.push({
              displayName: p.displayName,
              checkInTime: p.earliestStartTime,
              checkOutTime: p.latestEndTime ?? conferenceEnd ?? null,
              durationMinutes: p.totalDurationMinutes,
              sessionCount: p.sessions.length,
              sessions: p.sessions,
              participantType: p.participantType
            })
          }
        } else {
          unmatchedParticipants.push({
            displayName: p.displayName || "Anonimo",
            checkInTime: p.earliestStartTime,
            checkOutTime: p.latestEndTime ?? conferenceEnd ?? null,
            durationMinutes: p.totalDurationMinutes,
            sessionCount: p.sessions.length,
            sessions: p.sessions,
            participantType: p.participantType
          })
        }
      }
    } catch (err: unknown) {
      console.error("Google Meet API error:", err)
      return NextResponse.json(
        { error: `Errore API Google Meet: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 500 }
      )
    }
  }

  // ── METHOD: EMAILS (manuale) ──────────────────────────────────────────────
  if (method === "emails" && emails) {
    participantEmails = emails
      .split(/[\n,;]/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes("@"))
  }

  // ── METHOD: CSV ───────────────────────────────────────────────────────────
  if (method === "csv" && csvData) {
    const lines = csvData.split("\n")
    for (const line of lines) {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (emailMatch) {
        participantEmails.push(emailMatch[0].toLowerCase())
      }
    }
  }

  if (participantEmails.length === 0 && unmatchedParticipants.length === 0) {
    return NextResponse.json(
      { error: "Nessun partecipante trovato" },
      { status: 400 }
    )
  }

  // Rimuovi duplicati
  participantEmails = [...new Set(participantEmails)]

  // Trova utenti nel DB per email
  const users = await db.user.findMany({
    where: { email: { in: participantEmails } },
    select: { id: true, email: true }
  })

  const foundEmails = new Set(users.map(u => u.email.toLowerCase()))
  const notFoundEmails = participantEmails.filter(e => !foundEmails.has(e))

  let synced = 0

  for (const user of users) {
    // Per il metodo auto, usa i dati reali di check-in/out da Google Meet
    const meetData = meetParticipantsData.find(
      p => p.email === user.email.toLowerCase()
    )

    // Costruisci le notes con i metadati Google Meet in JSON
    const buildNotes = (data: typeof meetParticipantsData[0] | undefined) => {
      if (!data) return "Sincronizzato da Google Meet"
      return JSON.stringify({
        source: "google-meet",
        durationMinutes: data.durationMinutes,
        sessionCount: data.sessionCount,
        sessions: data.sessions,
        participantType: data.participantType,
        displayName: data.displayName
      })
    }

    await db.sessionAttendance.upsert({
      where: {
        sessionId_userId: { sessionId, userId: user.id }
      },
      create: {
        sessionId,
        userId: user.id,
        status: "ATTENDED",
        checkInTime: meetData?.checkInTime ?? liveSession.startTime,
        checkOutTime: meetData?.checkOutTime ?? liveSession.endTime,
        durationMinutes: meetData?.durationMinutes ?? (liveSession.endTime && liveSession.startTime
          ? Math.round((liveSession.endTime.getTime() - liveSession.startTime.getTime()) / (1000 * 60))
          : null),
        notes: method === "auto" ? buildNotes(meetData) : "Sincronizzato da Google Meet"
      },
      update: {
        status: "ATTENDED",
        ...(meetData ? {
          checkInTime: meetData.checkInTime,
          checkOutTime: meetData.checkOutTime,
          durationMinutes: meetData.durationMinutes,
          notes: buildNotes(meetData)
        } : {
          notes: "Sincronizzato da Google Meet"
        })
      }
    })
    synced++
  }

  // Salva i partecipanti non matchati nella LiveSession per mostrarli nel registro
  if (method === "auto") {
    // Aggiungi anche chi ha email non trovata nel DB come "unmatched"
    const notFoundAsUnmatched = notFoundEmails.map(email => {
      const data = meetParticipantsData.find(p => p.email === email)
      return {
        displayName: data?.displayName || email,
        email,
        checkInTime: data ? data.checkInTime.toISOString() : null,
        checkOutTime: data ? data.checkOutTime.toISOString() : null,
        durationMinutes: data?.durationMinutes ?? 0,
        sessionCount: data?.sessionCount ?? 1,
        sessions: data?.sessions ?? [],
        participantType: data?.participantType ?? "google" as const
      }
    })

    const allUnmatched = [
      ...unmatchedParticipants,
      ...notFoundAsUnmatched
    ]

    await db.liveSession.update({
      where: { id: sessionId },
      data: {
        unmatchedMeetParticipants: allUnmatched.length > 0 ? allUnmatched : Prisma.DbNull
      }
    })
  }

  return NextResponse.json({
    success: true,
    synced,
    notFound: notFoundEmails.length,
    notFoundEmails: notFoundEmails.slice(0, 10),
    unmatchedParticipants: unmatchedParticipants.length > 0 ? unmatchedParticipants : undefined,
    totalProcessed: participantEmails.length,
    totalFromMeet: method === "auto" ? participantEmails.length + unmatchedParticipants.length : undefined,
    method
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
  const { sessionId, googleMeetCode, action } = body

  // Disconnetti Google Meet
  if (action === "disconnect") {
    await disconnectGoogleMeet()
    return NextResponse.json({ success: true, message: "Google Meet disconnesso" })
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 })
  }

  // Estrai il codice dal URL completo se necessario
  let code = googleMeetCode
  if (code?.includes("meet.google.com/")) {
    const match = code.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/)
    if (match) code = match[1]
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

/**
 * PATCH /api/integrations/google-meet
 * Associate an anonymous/unmatched Google Meet participant to an LMS user
 */
export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  const body = await request.json()
  const { sessionId, userId, displayName, checkInTime, checkOutTime, durationMinutes, sessionCount, sessions, participantType } = body

  if (!sessionId || !userId) {
    return NextResponse.json({ error: "sessionId e userId richiesti" }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
  }

  const notes = JSON.stringify({
    source: "google-meet",
    durationMinutes: durationMinutes ?? 0,
    sessionCount: sessionCount ?? 1,
    sessions: sessions ?? [],
    participantType: participantType ?? "anonymous",
    displayName: displayName ?? "Anonimo"
  })

  await db.sessionAttendance.upsert({
    where: {
      sessionId_userId: { sessionId, userId: user.id }
    },
    create: {
      sessionId,
      userId: user.id,
      status: "ATTENDED",
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      durationMinutes: durationMinutes ?? 0,
      notes
    },
    update: {
      status: "ATTENDED",
      checkInTime: checkInTime ? new Date(checkInTime) : undefined,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      durationMinutes: durationMinutes ?? undefined,
      notes
    }
  })

  // Rimuovi il partecipante dalla lista unmatched della sessione
  const liveSession = await db.liveSession.findUnique({
    where: { id: sessionId },
    select: { unmatchedMeetParticipants: true }
  })

  if (liveSession?.unmatchedMeetParticipants) {
    const unmatched = liveSession.unmatchedMeetParticipants as Array<{ displayName: string }>
    const updated = unmatched.filter((p: { displayName: string }) => p.displayName !== displayName)
    await db.liveSession.update({
      where: { id: sessionId },
      data: {
        unmatchedMeetParticipants: updated.length > 0 ? updated : Prisma.DbNull
      }
    })
  }

  return NextResponse.json({
    success: true,
    message: `Partecipante "${displayName}" associato a ${user.name || user.email}`
  })
}
