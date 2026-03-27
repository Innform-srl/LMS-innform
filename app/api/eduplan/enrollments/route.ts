/**
 * EduPlan Enrollment Endpoint
 * Allows EduPlan to enroll users in specific LMS courses and retrieve student enrollments
 *
 * GET /api/eduplan/enrollments?email={student_email}
 * Headers:
 *   - X-API-Key: <API key>
 *
 * POST /api/eduplan/enrollments
 * Headers:
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportError } from '@/lib/error-reporting'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/security'

// Secret for HMAC verification - requires env var to be set
const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET

// Rate limit: 30 requests per minute
const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

// CORS headers for cross-origin requests from innform.eu
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-TMS-Signature, X-TMS-Timestamp',
}

/**
 * OPTIONS /api/eduplan/enrollments
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

interface EduPlanEnrollmentPayload {
  user_email: string
  course_id: string
  edition_id?: string
  eduplan_enrollment_id: string
  due_date?: string
}

// Validate API key from request
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  const expectedKey = process.env.EDUPLAN_API_KEY

  if (!expectedKey) {
    console.error('[EDUPLAN ENROLLMENTS] EDUPLAN_API_KEY not configured')
    return false
  }

  return apiKey === expectedKey
}

/**
 * GET /api/eduplan/enrollments
 * Retrieve enrollments for a student by email
 * Used by innform.eu to display student's courses in dashboard
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:enrollments:get:${ip}`

    // Check rate limit
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const status = searchParams.get('status') // 'completed', 'in_progress', 'all' (default)
    const includeCertificate = searchParams.get('include_certificate') !== 'false' // default true
    const eduCourseIds = searchParams.get('eduCourseIds') // comma-separated list of EDU course IDs
    const editionIdFilter = searchParams.get('edition_id') // filter by specific edition
    const includeEdition = searchParams.get('include_edition') === 'true' // include edition data

    // Validate email parameter
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: email' },
        { status: 400, headers: corsHeaders }
      )
    }

    const normalizedEmail = email.toLowerCase()

    // Parse eduCourseIds if provided
    const eduCourseIdList = eduCourseIds
      ? eduCourseIds.split(',').map((id) => id.trim()).filter(Boolean)
      : null

    console.log('[EDUPLAN ENROLLMENTS] GET request:', {
      requestId,
      email: normalizedEmail,
      status,
      includeCertificate,
      eduCourseIds: eduCourseIdList,
    })

    // Find user by email (case-insensitive)
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // If user not found, return empty enrollments (as per requirements)
    if (!user) {
      console.log('[EDUPLAN ENROLLMENTS] User not found, returning empty:', {
        requestId,
        email: normalizedEmail,
      })
      return NextResponse.json({
        success: true,
        data: {
          student: null,
          enrollments: [],
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }, { headers: corsHeaders })
    }

    // If eduCourseIds provided, get the mapped LMS course IDs
    let allowedLmsCourseIds: string[] | null = null

    if (eduCourseIdList && eduCourseIdList.length > 0) {
      // Find all LMS courses that are mapped to the provided EDU course IDs
      const mappings = await db.courseTMSMapping.findMany({
        where: {
          tmsCourseId: { in: eduCourseIdList },
          syncEnabled: true,
        },
        select: {
          courseId: true,
          tmsCourseId: true,
        },
      })

      allowedLmsCourseIds = mappings.map((m) => m.courseId)

      console.log('[EDUPLAN ENROLLMENTS] Course mappings found:', {
        requestId,
        eduCourseIds: eduCourseIdList,
        mappedLmsCourseIds: allowedLmsCourseIds,
        mappingsCount: mappings.length,
      })

      // If no mappings found, return empty enrollments
      if (allowedLmsCourseIds.length === 0) {
        console.log('[EDUPLAN ENROLLMENTS] No course mappings found, returning empty:', {
          requestId,
          eduCourseIds: eduCourseIdList,
        })
        return NextResponse.json({
          success: true,
          data: {
            student: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
            enrollments: [],
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            totalCount: 0,
            note: 'No LMS courses mapped to the provided EDU course IDs',
          },
        }, { headers: corsHeaders })
      }
    }

    // Build where clause for enrollments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { userId: user.id }

    if (status === 'completed') {
      whereClause.completed = true
    } else if (status === 'in_progress') {
      whereClause.completed = false
    }
    // 'all' or undefined = no filter

    // Filter by mapped LMS courses if eduCourseIds was provided
    if (allowedLmsCourseIds) {
      whereClause.courseId = { in: allowedLmsCourseIds }
    }

    // Filter by edition if provided
    if (editionIdFilter) {
      whereClause.editionId = editionIdFilter
    }

    // Fetch enrollments with course and certificate data
    const enrollments = await db.enrollment.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            isRequired: true,
            minimumDuration: true,
            dueInDays: true,
            tmsMappings: {
              where: { syncEnabled: true },
              select: {
                tmsCourseId: true,
                tmsCourseCode: true,
              },
            },
          },
        },
        ...(includeCertificate && {
          certificate: {
            select: {
              id: true,
              certificateNumber: true,
              verificationCode: true,
              issuedAt: true,
            },
          },
        }),
        ...(includeEdition && {
          edition: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        }),
      },
      orderBy: [
        { completed: 'asc' }, // In progress first
        { dueDate: 'asc' }, // Then by due date
        { createdAt: 'desc' }, // Then by most recent
      ],
    })

    // Transform to response format
    const formattedEnrollments = enrollments.map((enrollment) => ({
      id: enrollment.id,
      tmsEnrollmentId: enrollment.tmsEnrollmentId,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        imageUrl: enrollment.course.imageUrl,
        isRequired: enrollment.course.isRequired,
        minimumDuration: enrollment.course.minimumDuration,
        // Include EDU course mappings for reference
        eduCourseMappings: enrollment.course.tmsMappings.map((m) => ({
          eduCourseId: m.tmsCourseId,
          eduCourseCode: m.tmsCourseCode,
        })),
      },
      progress: enrollment.progress,
      completed: enrollment.completed,
      timeSpent: enrollment.timeSpent,
      createdAt: enrollment.createdAt.toISOString(),
      dueDate: enrollment.dueDate?.toISOString() || null,
      completedAt: enrollment.completedAt?.toISOString() || null,
      lastActivityAt: enrollment.lastActivityAt.toISOString(),
      certificate: includeCertificate && enrollment.certificate
        ? {
            id: enrollment.certificate.id,
            certificateNumber: enrollment.certificate.certificateNumber,
            verificationCode: enrollment.certificate.verificationCode,
            issuedAt: enrollment.certificate.issuedAt.toISOString(),
            downloadUrl: `/api/certificates/${enrollment.certificate.id}/download`,
          }
        : null,
      edition_id: enrollment.editionId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((includeEdition && (enrollment as any).edition) ? {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edition_code: (enrollment as any).edition.code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edition_title: (enrollment as any).edition.title,
      } : {}),
    }))

    console.log('[EDUPLAN ENROLLMENTS] Returning enrollments:', {
      requestId,
      userId: user.id,
      email: user.email,
      totalEnrollments: formattedEnrollments.length,
      completedCount: formattedEnrollments.filter((e) => e.completed).length,
      inProgressCount: formattedEnrollments.filter((e) => !e.completed).length,
    })

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        enrollments: formattedEnrollments,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        totalCount: formattedEnrollments.length,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('[EDUPLAN ENROLLMENTS] GET Error:', error)
    reportError(error, { route: "eduplan/enrollments", action: "get" })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId,
      },
      { status: 500, headers: corsHeaders }
    )
  }
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
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
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

    console.log('[EDUPLAN ENROLLMENT] Processing request:', {
      requestId,
      user_email: normalizedEmail,
      course_id: payload.course_id,
      eduplan_enrollment_id: payload.eduplan_enrollment_id,
    })

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      console.error('[EDUPLAN ENROLLMENT] User not found:', {
        requestId,
        email: normalizedEmail,
      })
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log('[EDUPLAN ENROLLMENT] User found:', {
      requestId,
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    // Find course by ID
    const course = await db.course.findUnique({
      where: { id: payload.course_id },
    })

    if (!course) {
      // Try to find course by title or other identifier for better error message
      const allCourses = await db.course.findMany({
        select: { id: true, title: true },
        take: 20,
      })
      console.error('[EDUPLAN ENROLLMENT] Course not found:', {
        requestId,
        requested_course_id: payload.course_id,
        available_courses: allCourses.map(c => ({ id: c.id, title: c.title })),
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
          code: 'COURSE_NOT_FOUND',
          requested_course_id: payload.course_id,
          hint: 'Verify the course_id matches an existing course in the LMS',
        },
        { status: 404 }
      )
    }

    console.log('[EDUPLAN ENROLLMENT] Course found:', {
      requestId,
      courseId: course.id,
      courseTitle: course.title,
    })

    // Validate edition_id if provided
    let editionId: string | null = null
    if (payload.edition_id) {
      const edition = await db.edition.findUnique({
        where: { id: payload.edition_id },
        select: { id: true, courseId: true },
      })

      if (!edition) {
        return NextResponse.json(
          { success: false, error: 'Edition not found', code: 'EDITION_NOT_FOUND' },
          { status: 404 }
        )
      }

      if (edition.courseId !== course.id) {
        return NextResponse.json(
          { success: false, error: 'Edition does not belong to the specified course', code: 'EDITION_COURSE_MISMATCH' },
          { status: 400 }
        )
      }

      editionId = edition.id
      console.log('[EDUPLAN ENROLLMENT] Edition validated:', {
        requestId,
        editionId: edition.id,
      })
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

    // Also get all enrollments for this user for debugging
    const userEnrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      include: { course: { select: { id: true, title: true } } },
    })

    console.log('[EDUPLAN ENROLLMENT] Enrollment check:', {
      requestId,
      userId: user.id,
      courseId: course.id,
      existingEnrollmentFound: !!existingEnrollment,
      existingEnrollmentId: existingEnrollment?.id || null,
      userTotalEnrollments: userEnrollments.length,
      userEnrolledCourses: userEnrollments.map(e => ({
        enrollmentId: e.id,
        courseId: e.course.id,
        courseTitle: e.course.title,
        tmsEnrollmentId: e.tmsEnrollmentId,
      })),
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
        console.log('[EDUPLAN ENROLLMENT] Updated existing enrollment with EduPlan ID:', {
          requestId,
          enrollmentId: existingEnrollment.id,
          tmsEnrollmentId: payload.eduplan_enrollment_id,
        })
      }

      console.log('[EDUPLAN ENROLLMENT] User already enrolled - returning existing:', {
        requestId,
        email: normalizedEmail,
        courseId: course.id,
        courseTitle: course.title,
        existingEnrollmentId: existingEnrollment.id,
      })
      return NextResponse.json({
        success: true,
        enrollment_id: existingEnrollment.id,
        existing: true,
        message: 'User already enrolled in this course',
        debug: {
          user_id: user.id,
          course_id: course.id,
          course_title: course.title,
        },
      })
    }

    // Create new enrollment
    const dueDate = payload.due_date ? new Date(payload.due_date) : null

    const enrollment = await db.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        editionId: editionId,
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
            edition_id: payload.edition_id || null,
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

    console.log('[EDUPLAN ENROLLMENT] Enrollment created successfully:', {
      requestId,
      email: normalizedEmail,
      userId: user.id,
      courseId: course.id,
      courseTitle: course.title,
      enrollmentId: enrollment.id,
      tmsEnrollmentId: payload.eduplan_enrollment_id,
    })

    return NextResponse.json(
      {
        success: true,
        enrollment_id: enrollment.id,
        message: 'User enrolled successfully',
        debug: {
          user_id: user.id,
          course_id: course.id,
          course_title: course.title,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[EDUPLAN ENROLLMENT] Error:', error)
    reportError(error, { route: "eduplan/enrollments", action: "post" })

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
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
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
    reportError(error, { route: "eduplan/enrollments", action: "delete" })

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
