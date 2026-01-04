/**
 * TMS Webhook Endpoint
 * Receives webhooks from the Training Management System
 *
 * Endpoints:
 * POST /api/webhooks/tms - Receive TMS events
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import {
  verifyTMSWebhookSignature,
  validateWebhookPayload,
  createWebhookErrorResponse,
  createWebhookSuccessResponse,
  WebhookErrorCodes,
  type TMSWebhookEvent,
  type TMSEnrollmentPayload,
  type TMSUserPayload,
} from '@/lib/webhook-utils'
import { checkRateLimit } from '@/lib/security'

// Rate limit: 30 requests per minute for webhooks
const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `webhook:tms:${ip}`

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        createWebhookErrorResponse(
          WebhookErrorCodes.RATE_LIMITED,
          'Too many requests',
          { retry_after_ms: rateLimit.resetAt - Date.now() }
        ),
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
    let webhookEvent: TMSWebhookEvent

    try {
      webhookEvent = JSON.parse(bodyText)
    } catch {
      return NextResponse.json(
        createWebhookErrorResponse(WebhookErrorCodes.VALIDATION_ERROR, 'Invalid JSON body'),
        { status: 400 }
      )
    }

    // Verify signature
    const signature = req.headers.get('x-tms-signature')
    const timestamp = req.headers.get('x-tms-timestamp') || webhookEvent.timestamp

    if (!verifyTMSWebhookSignature(signature, bodyText, timestamp)) {
      // Log failed signature attempt
      await logWebhookEvent({
        eventType: webhookEvent.event || 'unknown',
        status: 'failed',
        errorMessage: 'Invalid signature',
        requestPayload: webhookEvent,
        ipAddress: ip,
      })

      return NextResponse.json(
        createWebhookErrorResponse(WebhookErrorCodes.INVALID_SIGNATURE, 'Invalid webhook signature'),
        { status: 401 }
      )
    }

    // Validate payload
    const validation = validateWebhookPayload(webhookEvent.event, webhookEvent.data)
    if (!validation.valid) {
      await logWebhookEvent({
        eventType: webhookEvent.event,
        status: 'failed',
        errorMessage: validation.error,
        requestPayload: webhookEvent,
        ipAddress: ip,
      })

      return NextResponse.json(
        createWebhookErrorResponse(WebhookErrorCodes.VALIDATION_ERROR, validation.error || 'Validation failed'),
        { status: 400 }
      )
    }

    // Check for duplicate events (idempotency)
    if (webhookEvent.timestamp) {
      const existingEvent = await db.auditLog.findFirst({
        where: {
          action: 'TMS_WEBHOOK_RECEIVED',
          entityType: 'Webhook',
          entityId: `${webhookEvent.event}:${webhookEvent.timestamp}`,
        },
      })

      if (existingEvent) {
        return NextResponse.json(
          createWebhookSuccessResponse({
            message: 'Event already processed',
            duplicate: true,
          })
        )
      }
    }

    // Process event based on type
    let result: WebhookHandlerResult

    switch (webhookEvent.event) {
      case 'enrollment_created':
        result = await handleEnrollmentCreated(webhookEvent.data as TMSEnrollmentPayload)
        break

      case 'enrollment_updated':
        result = await handleEnrollmentUpdated(webhookEvent.data as TMSEnrollmentPayload)
        break

      case 'enrollment_cancelled':
        result = await handleEnrollmentCancelled(webhookEvent.data as TMSEnrollmentPayload)
        break

      case 'user_created':
        result = await handleUserCreated(webhookEvent.data as TMSUserPayload)
        break

      case 'user_updated':
        result = await handleUserUpdated(webhookEvent.data as TMSUserPayload)
        break

      case 'course_mapping_updated':
        result = await handleCourseMappingUpdated(webhookEvent.data)
        break

      default:
        result = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unknown event type: ${webhookEvent.event}`,
          },
        }
    }

    // Log successful event
    await logWebhookEvent({
      eventType: webhookEvent.event,
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error?.message,
      requestPayload: webhookEvent,
      responsePayload: result,
      ipAddress: ip,
      processingTimeMs: Date.now() - startTime,
    })

    if (!result.success) {
      return NextResponse.json(
        createWebhookErrorResponse(
          (result.error?.code as typeof WebhookErrorCodes[keyof typeof WebhookErrorCodes]) || WebhookErrorCodes.INTERNAL_ERROR,
          result.error?.message || 'Processing failed',
          result.error?.details
        ),
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json(createWebhookSuccessResponse(result.data))
  } catch (error) {
    console.error('[WEBHOOK_ERROR]', error)

    await logWebhookEvent({
      eventType: 'unknown',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json(
      createWebhookErrorResponse(
        WebhookErrorCodes.INTERNAL_ERROR,
        'Internal server error'
      ),
      { status: 500 }
    )
  }
}

// Types
interface WebhookHandlerResult {
  success: boolean
  data?: Record<string, unknown>
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  statusCode?: number
}

interface WebhookLogData {
  eventType: string
  status: 'success' | 'failed' | 'pending'
  errorMessage?: string
  requestPayload?: unknown
  responsePayload?: unknown
  ipAddress?: string
  processingTimeMs?: number
}

// Helper to log webhook events
async function logWebhookEvent(data: WebhookLogData) {
  try {
    await db.webhookEvent.create({
      data: {
        source: 'tms',
        eventType: data.eventType,
        direction: 'incoming',
        status: data.status,
        requestPayload: data.requestPayload as object,
        responsePayload: data.responsePayload as object,
        errorMessage: data.errorMessage,
        processedAt: data.status === 'success' ? new Date() : null,
      },
    })
  } catch (error) {
    console.error('[WEBHOOK_LOG_ERROR]', error)
  }
}

// Handler: Enrollment Created
async function handleEnrollmentCreated(
  payload: TMSEnrollmentPayload
): Promise<WebhookHandlerResult> {
  const { user, course, organization } = payload

  try {
    // Find or create user
    let dbUser = await db.user.findUnique({
      where: { email: user.email.toLowerCase() },
    })

    if (!dbUser) {
      // Create new user with temporary password
      const tempPassword = crypto.randomUUID()
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Find or create company if organization provided
      let companyId: string | undefined
      if (organization?.name) {
        const company = await db.company.upsert({
          where: { name: organization.name },
          create: { name: organization.name },
          update: {},
        })
        companyId = company.id
      }

      dbUser = await db.user.create({
        data: {
          email: user.email.toLowerCase(),
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          isApproved: true, // Auto-approve TMS users
          approvedAt: new Date(),
          companyId,
        },
      })

      // Create initial user stats for gamification
      await db.userStats.create({
        data: { userId: dbUser.id },
      })

      // TODO: Send welcome email with password reset link
    }

    // Find course by LMS course ID or code
    const dbCourse = await db.course.findFirst({
      where: {
        OR: [
          { id: course.lms_course_id },
          { title: course.title },
        ],
        published: true,
      },
    })

    if (!dbCourse) {
      return {
        success: false,
        error: {
          code: WebhookErrorCodes.COURSE_NOT_FOUND,
          message: `Course not found: ${course.lms_course_id || course.title}`,
          details: { course_code: course.code, lms_course_id: course.lms_course_id },
        },
        statusCode: 404,
      }
    }

    // Calculate due date
    let dueDate: Date | undefined
    if (course.end_date) {
      dueDate = new Date(course.end_date)
    } else if (dbCourse.dueInDays) {
      dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + dbCourse.dueInDays)
    }

    // Create or update enrollment
    const enrollment = await db.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: dbUser.id,
          courseId: dbCourse.id,
        },
      },
      create: {
        userId: dbUser.id,
        courseId: dbCourse.id,
        dueDate,
        progress: 0,
        completed: false,
        // TMS integration fields
        tmsEnrollmentId: payload.enrollment_id,
        tmsUserId: payload.tms_user_id,
        tmsSyncedAt: new Date(),
      },
      update: {
        dueDate,
        // Update TMS fields if provided
        ...(payload.enrollment_id && { tmsEnrollmentId: payload.enrollment_id }),
        ...(payload.tms_user_id && { tmsUserId: payload.tms_user_id }),
        tmsSyncedAt: new Date(),
        // Don't reset progress if already enrolled
      },
    })

    // Create notification for user
    await db.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Nuovo corso assegnato',
        message: `Sei stato iscritto al corso "${dbCourse.title}"`,
        type: 'NEW_COURSE',
        link: `/courses/${dbCourse.id}`,
      },
    })

    return {
      success: true,
      data: {
        lms_user_id: dbUser.id,
        lms_enrollment_id: enrollment.id,
        user_created: !dbUser,
        message: 'Enrollment created successfully',
      },
    }
  } catch (error) {
    console.error('[ENROLLMENT_CREATED_ERROR]', error)
    return {
      success: false,
      error: {
        code: WebhookErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to create enrollment',
      },
      statusCode: 500,
    }
  }
}

// Handler: Enrollment Updated
async function handleEnrollmentUpdated(
  payload: TMSEnrollmentPayload
): Promise<WebhookHandlerResult> {
  const { user, course } = payload

  try {
    const dbUser = await db.user.findUnique({
      where: { email: user.email.toLowerCase() },
    })

    if (!dbUser) {
      return {
        success: false,
        error: {
          code: WebhookErrorCodes.USER_NOT_FOUND,
          message: `User not found: ${user.email}`,
        },
        statusCode: 404,
      }
    }

    const dbCourse = await db.course.findFirst({
      where: {
        OR: [
          { id: course.lms_course_id },
          { title: course.title },
        ],
      },
    })

    if (!dbCourse) {
      return {
        success: false,
        error: {
          code: WebhookErrorCodes.COURSE_NOT_FOUND,
          message: `Course not found: ${course.lms_course_id || course.title}`,
        },
        statusCode: 404,
      }
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: dbUser.id,
          courseId: dbCourse.id,
        },
      },
    })

    if (!enrollment) {
      return {
        success: false,
        error: {
          code: WebhookErrorCodes.ENROLLMENT_NOT_FOUND,
          message: `Enrollment not found for user ${user.email} in course ${course.code}`,
        },
        statusCode: 404,
      }
    }

    // Update enrollment
    let dueDate: Date | undefined
    if (course.end_date) {
      dueDate = new Date(course.end_date)
    }

    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        ...(dueDate && { dueDate }),
      },
    })

    return {
      success: true,
      data: {
        lms_enrollment_id: enrollment.id,
        message: 'Enrollment updated successfully',
      },
    }
  } catch (error) {
    console.error('[ENROLLMENT_UPDATED_ERROR]', error)
    return {
      success: false,
      error: {
        code: WebhookErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update enrollment',
      },
      statusCode: 500,
    }
  }
}

// Handler: Enrollment Cancelled
async function handleEnrollmentCancelled(
  payload: TMSEnrollmentPayload
): Promise<WebhookHandlerResult> {
  const { user, course, enrollment_id } = payload

  console.log('[ENROLLMENT_CANCELLED] Processing v2:', { email: user.email, enrollment_id })

  try {
    const dbUser = await db.user.findUnique({
      where: { email: user.email.toLowerCase() },
      include: {
        enrollments: {
          where: { tmsEnrollmentId: { not: null } },
          select: { id: true, courseId: true, tmsEnrollmentId: true }
        }
      }
    })

    if (!dbUser) {
      // User doesn't exist, nothing to cancel
      return {
        success: true,
        data: { message: 'User not found, nothing to cancel' },
      }
    }

    // First try to find enrollment by tmsEnrollmentId (most reliable)
    let enrollmentToDelete = await db.enrollment.findFirst({
      where: {
        userId: dbUser.id,
        tmsEnrollmentId: enrollment_id,
      },
      include: { course: { select: { title: true } } }
    })

    // If not found by enrollment_id, try by course info
    if (!enrollmentToDelete && course) {
      const dbCourse = await db.course.findFirst({
        where: {
          OR: [
            { id: course.lms_course_id },
            { title: course.title },
          ],
        },
      })

      if (dbCourse) {
        enrollmentToDelete = await db.enrollment.findFirst({
          where: {
            userId: dbUser.id,
            courseId: dbCourse.id,
          },
          include: { course: { select: { title: true } } }
        })
      }
    }

    if (!enrollmentToDelete) {
      // No enrollment found - check if we should delete user anyway
      // (they might have been enrolled only via this enrollment that's already gone)
      const remainingEnrollments = dbUser.enrollments.length

      if (remainingEnrollments === 0) {
        // User has no EduPlan enrollments, delete them
        await db.user.delete({
          where: { id: dbUser.id }
        })
        console.log(`[WEBHOOK] User ${dbUser.email} deleted - no EduPlan enrollments found`)
        return {
          success: true,
          data: {
            message: 'User deleted (no EduPlan enrollments found)',
            user_deleted: true,
          },
        }
      }

      return {
        success: true,
        data: { message: 'Enrollment not found, nothing to cancel' },
      }
    }

    const courseTitle = enrollmentToDelete.course?.title || 'Corso'

    // Delete the enrollment
    await db.enrollment.delete({
      where: { id: enrollmentToDelete.id },
    })

    // Check remaining EduPlan enrollments (excluding the one we just deleted)
    const remainingEduPlanEnrollments = dbUser.enrollments.filter(
      e => e.id !== enrollmentToDelete!.id
    ).length

    let userDeleted = false

    // If no more EduPlan enrollments, delete the user entirely
    if (remainingEduPlanEnrollments === 0) {
      // Delete user and all related data (cascades handled by Prisma)
      await db.user.delete({
        where: { id: dbUser.id }
      })
      userDeleted = true
      console.log(`[WEBHOOK] User ${dbUser.email} deleted - no more EduPlan enrollments`)
    } else {
      // Notify user about cancelled enrollment
      await db.notification.create({
        data: {
          userId: dbUser.id,
          title: 'Iscrizione cancellata',
          message: `La tua iscrizione al corso "${courseTitle}" è stata cancellata`,
          type: 'INFO',
        },
      })
    }

    return {
      success: true,
      data: {
        message: userDeleted
          ? 'Enrollment cancelled and user deleted (no more EduPlan enrollments)'
          : 'Enrollment cancelled successfully',
        user_deleted: userDeleted,
        remaining_enrollments: remainingEduPlanEnrollments
      },
    }
  } catch (error) {
    console.error('[ENROLLMENT_CANCELLED_ERROR]', error)
    return {
      success: false,
      error: {
        code: WebhookErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to cancel enrollment',
      },
      statusCode: 500,
    }
  }
}

// Handler: User Created
async function handleUserCreated(payload: TMSUserPayload): Promise<WebhookHandlerResult> {
  try {
    const existingUser = await db.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    })

    if (existingUser) {
      return {
        success: true,
        data: {
          lms_user_id: existingUser.id,
          message: 'User already exists',
          existing: true,
        },
      }
    }

    // Create new user
    const tempPassword = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const newUser = await db.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name: `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || payload.email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        isApproved: true,
        approvedAt: new Date(),
      },
    })

    // Create user stats
    await db.userStats.create({
      data: { userId: newUser.id },
    })

    return {
      success: true,
      data: {
        lms_user_id: newUser.id,
        message: 'User created successfully',
      },
    }
  } catch (error) {
    console.error('[USER_CREATED_ERROR]', error)
    return {
      success: false,
      error: {
        code: WebhookErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to create user',
      },
      statusCode: 500,
    }
  }
}

// Handler: User Updated
async function handleUserUpdated(payload: TMSUserPayload): Promise<WebhookHandlerResult> {
  try {
    const dbUser = await db.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    })

    if (!dbUser) {
      return {
        success: false,
        error: {
          code: WebhookErrorCodes.USER_NOT_FOUND,
          message: `User not found: ${payload.email}`,
        },
        statusCode: 404,
      }
    }

    // Update user with provided changes
    const updateData: Record<string, unknown> = {}

    if (payload.first_name || payload.last_name) {
      updateData.name = `${payload.first_name || ''} ${payload.last_name || ''}`.trim()
    }

    if (payload.company) {
      // Find or create company
      const company = await db.company.upsert({
        where: { name: payload.company },
        create: { name: payload.company },
        update: {},
      })
      updateData.companyId = company.id
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: dbUser.id },
        data: updateData,
      })
    }

    return {
      success: true,
      data: {
        lms_user_id: dbUser.id,
        message: 'User updated successfully',
      },
    }
  } catch (error) {
    console.error('[USER_UPDATED_ERROR]', error)
    return {
      success: false,
      error: {
        code: WebhookErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update user',
      },
      statusCode: 500,
    }
  }
}

// Handler: Course Mapping Updated (placeholder for future use)
async function handleCourseMappingUpdated(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload: unknown
): Promise<WebhookHandlerResult> {
  // This would be used if we implement course mapping table
  return {
    success: true,
    data: { message: 'Course mapping update acknowledged' },
  }
}
