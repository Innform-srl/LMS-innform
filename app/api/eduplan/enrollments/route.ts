/**
 * EduPlan Enrollment Endpoint
 * Allows EduPlan to enroll users in specific LMS courses
 *
 * POST /api/eduplan/enrollments
 * Headers:
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/security'

// Secret for HMAC verification - use env var or fallback
const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET || 'innform-lms-tms-integration-2025-secret'

// Rate limit: 30 requests per minute
const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

interface EduPlanEnrollmentPayload {
  user_email: string
  course_id: string
  eduplan_enrollment_id: string
  due_date?: string
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(signature: string | null, body: string, timestamp: string | null): boolean {
  if (!signature || !LMS_WEBHOOK_SECRET) {
    console.error('[EDUPLAN ENROLLMENT] Missing signature or secret')
    return false
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (Math.abs(now - webhookTime) > fiveMinutes) {
      console.error('[EDUPLAN ENROLLMENT] Timestamp too old, possible replay attack')
      return false
    }
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', LMS_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  const expectedWithPrefix = `sha256=${expectedSignature}`

  // Timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedWithPrefix)

    if (sigBuffer.length !== expectedBuffer.length) {
      // Try without prefix
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:enrollments:${ip}`

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }

    // Parse body
    const bodyText = await req.text()
    let payload: EduPlanEnrollmentPayload

    try {
      payload = JSON.parse(bodyText)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Verify signature
    const signature = req.headers.get('x-tms-signature')
    const timestamp = req.headers.get('x-tms-timestamp')

    if (!verifySignature(signature, bodyText, timestamp)) {
      console.error('[EDUPLAN ENROLLMENT] Invalid signature', { user_email: payload.user_email })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!payload.user_email) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: user_email' },
        { status: 400 }
      )
    }

    if (!payload.course_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: course_id' },
        { status: 400 }
      )
    }

    if (!payload.eduplan_enrollment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: eduplan_enrollment_id' },
        { status: 400 }
      )
    }

    // Find user by email (case-insensitive)
    const normalizedEmail = payload.user_email.toLowerCase()
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      console.error('[EDUPLAN ENROLLMENT] User not found:', normalizedEmail)
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Find course by ID
    const course = await db.course.findUnique({
      where: { id: payload.course_id },
    })

    if (!course) {
      console.error('[EDUPLAN ENROLLMENT] Course not found:', payload.course_id)
      return NextResponse.json(
        { success: false, error: 'Course not found', code: 'COURSE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if enrollment already exists
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    })

    if (existingEnrollment) {
      // Update existing enrollment with EduPlan ID if not set
      if (!existingEnrollment.tmsEnrollmentId) {
        await db.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            tmsEnrollmentId: payload.eduplan_enrollment_id,
            tmsSyncedAt: new Date(),
          },
        })
      }

      console.log('[EDUPLAN ENROLLMENT] User already enrolled:', normalizedEmail, '->', course.id)
      return NextResponse.json({
        success: true,
        enrollment_id: existingEnrollment.id,
        existing: true,
        message: 'User already enrolled in this course',
      })
    }

    // Create new enrollment
    const dueDate = payload.due_date ? new Date(payload.due_date) : null

    const enrollment = await db.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        progress: 0,
        completed: false,
        timeSpent: 0,
        tmsEnrollmentId: payload.eduplan_enrollment_id,
        tmsSyncedAt: new Date(),
        ...(dueDate && { dueDate }),
      },
    })

    // Log the webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'enrollment_created',
          direction: 'incoming',
          status: 'success',
          requestPayload: {
            user_email: payload.user_email,
            course_id: payload.course_id,
            eduplan_enrollment_id: payload.eduplan_enrollment_id,
            due_date: payload.due_date,
          },
          responsePayload: {
            enrollment_id: enrollment.id,
            success: true,
          },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN ENROLLMENT] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN ENROLLMENT] Enrollment created:', normalizedEmail, '->', course.id, '| ID:', enrollment.id)

    return NextResponse.json(
      {
        success: true,
        enrollment_id: enrollment.id,
        message: 'User enrolled successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[EDUPLAN ENROLLMENT] Error:', error)

    // Log the error
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'enrollment_created',
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
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/eduplan/enrollments
 * Remove enrollment when EduPlan cancels it
 */
export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:enrollments:delete:${ip}`

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Parse body
    const bodyText = await req.text()
    let payload: { user_email?: string; course_id?: string; eduplan_enrollment_id?: string }

    try {
      payload = JSON.parse(bodyText)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Verify signature
    const signature = req.headers.get('x-tms-signature')
    const timestamp = req.headers.get('x-tms-timestamp')

    if (!verifySignature(signature, bodyText, timestamp)) {
      console.error('[EDUPLAN ENROLLMENT] Invalid signature for deletion')
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Find enrollment by eduplan_enrollment_id OR by user_email + course_id
    let enrollment = null

    if (payload.eduplan_enrollment_id) {
      enrollment = await db.enrollment.findFirst({
        where: { tmsEnrollmentId: payload.eduplan_enrollment_id },
      })
    }

    if (!enrollment && payload.user_email && payload.course_id) {
      const user = await db.user.findUnique({
        where: { email: payload.user_email.toLowerCase() },
      })

      if (user) {
        enrollment = await db.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: payload.course_id,
            },
          },
        })
      }
    }

    if (!enrollment) {
      console.log('[EDUPLAN ENROLLMENT] Enrollment not found for deletion')
      return NextResponse.json({
        success: true,
        message: 'Enrollment not found, nothing to delete',
      })
    }

    // Delete the enrollment
    await db.enrollment.delete({
      where: { id: enrollment.id },
    })

    // Log the webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'enrollment_deleted',
          direction: 'incoming',
          status: 'success',
          requestPayload: payload,
          responsePayload: { enrollment_id: enrollment.id, success: true },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN ENROLLMENT] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN ENROLLMENT] Enrollment deleted:', enrollment.id)

    return NextResponse.json({
      success: true,
      message: 'Enrollment deleted successfully',
    })
  } catch (error) {
    console.error('[EDUPLAN ENROLLMENT] Error deleting enrollment:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        request_id: requestId,
      },
      { status: 500 }
    )
  }
}
