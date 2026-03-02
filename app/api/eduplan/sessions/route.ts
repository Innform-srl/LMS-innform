/**
 * EduPlan Sessions Endpoint
 * Allows EduPlan TMS to sync lesson calendar as LiveSessions on the LMS
 *
 * POST /api/eduplan/sessions - Create or update a LiveSession from TMS lesson
 * DELETE /api/eduplan/sessions - Delete a LiveSession synced from TMS
 *
 * Headers:
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { reportError } from '@/lib/error-reporting'
import { checkRateLimit } from '@/lib/security'

const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET

const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-TMS-Signature, X-TMS-Timestamp',
}

/**
 * OPTIONS /api/eduplan/sessions
 */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

interface EduPlanSessionPayload {
  tms_lesson_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  course_id: string
  instructor_email: string
  room_name?: string
  session_type?: 'ONLINE' | 'IN_PERSON' | 'HYBRID'
  meeting_url?: string
  max_participants?: number
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(signature: string | null, body: string, timestamp: string | null): boolean {
  if (!signature || !LMS_WEBHOOK_SECRET) {
    console.error('[EDUPLAN SESSIONS] Missing signature or secret')
    return false
  }

  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (Math.abs(now - webhookTime) > fiveMinutes) {
      console.error('[EDUPLAN SESSIONS] Timestamp too old, possible replay attack')
      return false
    }
  }

  const expectedSignature = crypto
    .createHmac('sha256', LMS_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  const expectedWithPrefix = `sha256=${expectedSignature}`

  try {
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedWithPrefix)

    if (sigBuffer.length !== expectedBuffer.length) {
      const expectedBufferNaked = Buffer.from(expectedSignature)
      if (sigBuffer.length === expectedBufferNaked.length) {
        return crypto.timingSafeEqual(sigBuffer, expectedBufferNaked)
      }
      return false
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * POST /api/eduplan/sessions
 * Create or update a LiveSession from a TMS lesson
 */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:sessions:${ip}`

    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }

    const bodyText = await req.text()
    let payload: EduPlanSessionPayload

    try {
      payload = JSON.parse(bodyText)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify signature
    const signature = req.headers.get('x-tms-signature')
    const timestamp = req.headers.get('x-tms-timestamp')

    if (!verifySignature(signature, bodyText, timestamp)) {
      console.error('[EDUPLAN SESSIONS] Invalid signature', { tms_lesson_id: payload.tms_lesson_id })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Validate required fields
    if (!payload.tms_lesson_id || !payload.title || !payload.start_time || !payload.end_time || !payload.course_id || !payload.instructor_email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tms_lesson_id, title, start_time, end_time, course_id, instructor_email' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[EDUPLAN SESSIONS] Processing session sync:', {
      requestId,
      tms_lesson_id: payload.tms_lesson_id,
      title: payload.title,
      course_id: payload.course_id,
      instructor_email: payload.instructor_email,
    })

    // Find course
    const course = await db.course.findUnique({
      where: { id: payload.course_id },
    })

    if (!course) {
      console.error('[EDUPLAN SESSIONS] Course not found:', payload.course_id)
      return NextResponse.json(
        { success: false, error: 'Course not found', code: 'COURSE_NOT_FOUND' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find instructor by email
    const normalizedEmail = payload.instructor_email.toLowerCase()
    const instructor = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!instructor) {
      console.error('[EDUPLAN SESSIONS] Instructor not found:', normalizedEmail)
      return NextResponse.json(
        { success: false, error: 'Instructor not found', code: 'INSTRUCTOR_NOT_FOUND' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find or create physical room
    let physicalRoomId: string | null = null
    if (payload.room_name) {
      let room = await db.physicalRoom.findFirst({
        where: { name: payload.room_name },
      })

      if (!room) {
        room = await db.physicalRoom.create({
          data: { name: payload.room_name, capacity: 30 },
        })
        console.log('[EDUPLAN SESSIONS] Created new PhysicalRoom:', room.id, room.name)
      }

      physicalRoomId = room.id
    }

    // Map session type
    const sessionType = (['ONLINE', 'IN_PERSON', 'HYBRID'].includes(payload.session_type || '')
      ? payload.session_type
      : 'IN_PERSON') as 'ONLINE' | 'IN_PERSON' | 'HYBRID'

    // Check if session already exists (upsert by tmsLessonId)
    const existingSession = await db.liveSession.findUnique({
      where: { tmsLessonId: payload.tms_lesson_id },
    })

    const sessionData = {
      title: payload.title,
      description: payload.description || null,
      startTime: new Date(payload.start_time),
      endTime: new Date(payload.end_time),
      courseId: payload.course_id,
      instructorId: instructor.id,
      sessionType,
      physicalRoomId,
      maxParticipants: payload.max_participants || null,
      tmsLessonId: payload.tms_lesson_id,
      tmsSyncedAt: new Date(),
    }

    let liveSession
    let isExisting = false

    if (existingSession) {
      // Only overwrite meetingUrl if EduPlan sends a non-empty one,
      // otherwise preserve the URL set manually in the LMS
      const updateData = {
        ...sessionData,
        ...(payload.meeting_url ? { meetingUrl: payload.meeting_url } : {}),
      }
      liveSession = await db.liveSession.update({
        where: { id: existingSession.id },
        data: updateData,
      })
      isExisting = true
      console.log('[EDUPLAN SESSIONS] Updated existing session:', liveSession.id)
    } else {
      liveSession = await db.liveSession.create({
        data: {
          ...sessionData,
          meetingUrl: payload.meeting_url || null,
        },
      })
      console.log('[EDUPLAN SESSIONS] Created new session:', liveSession.id)
    }

    // Log webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: isExisting ? 'session_updated' : 'session_created',
          direction: 'incoming',
          status: 'success',
          requestPayload: {
            tms_lesson_id: payload.tms_lesson_id,
            title: payload.title,
            course_id: payload.course_id,
            instructor_email: payload.instructor_email,
          },
          responsePayload: {
            session_id: liveSession.id,
            existing: isExisting,
          },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN SESSIONS] Failed to log webhook event:', logError)
    }

    return NextResponse.json(
      {
        success: true,
        session_id: liveSession.id,
        existing: isExisting,
        message: isExisting ? 'Session updated successfully' : 'Session created successfully',
      },
      { status: isExisting ? 200 : 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('[EDUPLAN SESSIONS] Error:', error)
    reportError(error, { route: "eduplan/sessions", action: "post" })

    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'session_sync',
          direction: 'incoming',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        },
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        request_id: requestId,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * DELETE /api/eduplan/sessions
 * Remove a LiveSession when TMS lesson is cancelled/deleted
 */
export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:sessions:delete:${ip}`

    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: corsHeaders }
      )
    }

    const bodyText = await req.text()
    let payload: { tms_lesson_id?: string; session_id?: string }

    try {
      payload = JSON.parse(bodyText)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify signature
    const signature = req.headers.get('x-tms-signature')
    const timestamp = req.headers.get('x-tms-timestamp')

    if (!verifySignature(signature, bodyText, timestamp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Find session
    let session = null

    if (payload.tms_lesson_id) {
      session = await db.liveSession.findUnique({
        where: { tmsLessonId: payload.tms_lesson_id },
      })
    }

    if (!session && payload.session_id) {
      session = await db.liveSession.findUnique({
        where: { id: payload.session_id },
      })
    }

    if (!session) {
      return NextResponse.json({
        success: true,
        message: 'Session not found, nothing to delete',
      }, { headers: corsHeaders })
    }

    await db.liveSession.delete({ where: { id: session.id } })

    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'session_deleted',
          direction: 'incoming',
          status: 'success',
          requestPayload: payload,
          responsePayload: { session_id: session.id, success: true },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN SESSIONS] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN SESSIONS] Session deleted:', session.id)

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('[EDUPLAN SESSIONS] Error deleting session:', error)
    reportError(error, { route: "eduplan/sessions", action: "delete" })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        request_id: requestId,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
