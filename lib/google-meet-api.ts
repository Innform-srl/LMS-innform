/**
 * Google Meet REST API v2 Integration
 * Recupera i partecipanti e le sessioni da Google Meet
 */

const MEET_API_BASE = "https://meet.googleapis.com/v2"

export interface MeetParticipant {
  name: string
  displayName: string
  email: string | null
  googleId: string | null
  earliestStartTime: string
  latestEndTime: string
  sessions: MeetSession[]
  totalDurationMinutes: number
  participantType: "google" | "anonymous" | "phone"
}

export interface MeetSession {
  startTime: string
  endTime: string
  durationMinutes: number
}

export interface ConferenceRecord {
  name: string
  startTime: string
  endTime: string | null
  spaceUri: string
}

/**
 * Genera l'URL OAuth2 per il consenso dell'admin
 */
export function getGoogleOAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_MEET_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_MEET_REDIRECT_URI!,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "openid",
      "email"
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    ...(state ? { state } : {})
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Scambia il code OAuth2 con access_token + refresh_token
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_MEET_CLIENT_ID!,
      client_secret: process.env.GOOGLE_MEET_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_MEET_REDIRECT_URI!,
      grant_type: "authorization_code"
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return res.json()
}

/**
 * Rinnova l'access_token usando il refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_MEET_CLIENT_ID!,
      client_secret: process.env.GOOGLE_MEET_CLIENT_SECRET!,
      grant_type: "refresh_token"
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return res.json()
}

/**
 * Trova il conferenceRecord da un meetingCode
 */
export async function getConferenceByMeetingCode(
  accessToken: string,
  meetingCode: string
): Promise<ConferenceRecord | null> {
  // Il meetingCode deve mantenere i trattini (xxx-xxxx-xxx)
  const filter = `space.meeting_code="${meetingCode}"`
  const url = `${MEET_API_BASE}/conferenceRecords?filter=${encodeURIComponent(filter)}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Conference lookup failed: ${error}`)
  }

  const data = await res.json()
  const records: ConferenceRecord[] = data.conferenceRecords || []

  if (records.length === 0) return null

  console.log(`[Google Meet] Found ${records.length} conference records for code "${meetingCode}":`,
    records.map(r => ({ name: r.name, start: r.startTime, end: r.endTime })))

  // Ritorna il record più recente
  return records.sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0]
}

interface RawMeetUser {
  user?: string
  displayName?: string
}

interface RawMeetParticipant {
  name: string
  earliestStartTime: string
  latestEndTime: string
  signedinUser?: RawMeetUser
  anonymousUser?: RawMeetUser
  phoneUser?: RawMeetUser
}

interface RawMeetSession {
  startTime: string
  endTime?: string
}

/**
 * Recupera tutti i partecipanti di una conferenza con le loro sessioni
 * Gestisce la paginazione dell'API Google Meet
 */
export async function getConferenceParticipants(
  accessToken: string,
  conferenceRecordName: string
): Promise<MeetParticipant[]> {
  // 1. Lista partecipanti (con paginazione)
  const rawParticipants: RawMeetParticipant[] = []
  let nextPageToken: string | undefined

  do {
    const url = new URL(`${MEET_API_BASE}/${conferenceRecordName}/participants`)
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken)

    const participantsRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!participantsRes.ok) {
      const error = await participantsRes.text()
      throw new Error(`Participants fetch failed: ${error}`)
    }

    const participantsData = await participantsRes.json()
    rawParticipants.push(...(participantsData.participants || []))
    nextPageToken = participantsData.nextPageToken
  } while (nextPageToken)

  const participants: MeetParticipant[] = []

  for (const p of rawParticipants) {
    // 2. Per ogni partecipante, recupera le sessioni (con paginazione)
    const sessions: MeetSession[] = []
    let sessionsPageToken: string | undefined

    do {
      const sessionsUrl = new URL(`${MEET_API_BASE}/${p.name}/participantSessions`)
      if (sessionsPageToken) sessionsUrl.searchParams.set("pageToken", sessionsPageToken)

      const sessionsRes = await fetch(sessionsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!sessionsRes.ok) break

      const sessionsData = await sessionsRes.json()
      const rawSessions = sessionsData.participantSessions || []

      sessions.push(...rawSessions.map((s: RawMeetSession) => {
        const start = new Date(s.startTime)
        const end = s.endTime ? new Date(s.endTime) : new Date()
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        return {
          startTime: s.startTime,
          endTime: s.endTime || null,
          durationMinutes
        }
      }))

      sessionsPageToken = sessionsData.nextPageToken
    } while (sessionsPageToken)

    // Calcola durata totale sommando tutte le sessioni
    const totalDurationMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)

    // Calcola check-in/out dalle sessioni individuali (più accurato dei campi aggregati)
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    const computedEarliestStart = sortedSessions.length > 0
      ? sortedSessions[0].startTime
      : p.earliestStartTime
    const lastSession = sortedSessions.length > 0
      ? sortedSessions[sortedSessions.length - 1]
      : null
    const computedLatestEnd = lastSession?.endTime ?? p.latestEndTime

    // signedinUser.user può essere "users/email@domain.com" o "users/123456789" (ID numerico)
    const rawUser = p.signedinUser?.user || null
    const email = rawUser && rawUser.includes("@") ? rawUser : null
    const googleId = rawUser && !rawUser.includes("@") ? rawUser.replace("users/", "") : null

    // Determina il tipo di partecipante
    const participantType: "google" | "anonymous" | "phone" = p.signedinUser
      ? "google"
      : p.phoneUser
        ? "phone"
        : "anonymous"

    participants.push({
      name: p.name,
      displayName: p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "Anonimo",
      email,
      googleId,
      earliestStartTime: computedEarliestStart,
      latestEndTime: computedLatestEnd,
      sessions,
      totalDurationMinutes,
      participantType
    })
  }

  return participants
}

/**
 * Estrae l'email dal formato Google Meet "users/email@domain.com"
 */
export function extractEmail(userIdentifier: string | null): string | null {
  if (!userIdentifier) return null
  // Il campo può essere direttamente un'email o nel formato "users/email"
  if (userIdentifier.includes("@")) return userIdentifier.toLowerCase()
  const match = userIdentifier.match(/users\/(.+)/)
  return match ? match[1].toLowerCase() : null
}
