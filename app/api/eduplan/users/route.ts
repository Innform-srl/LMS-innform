/**
 * EduPlan User Sync Endpoint
 * Receives user data from EduPlan/TMS for synchronization
 *
 * POST /api/eduplan/users
 * Headers:
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/security'

// Secret for HMAC verification - use env var or fallback
const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET || 'innform-lms-tms-integration-2025-secret'

// Rate limit: 30 requests per minute
const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

interface EduPlanUserPayload {
  email: string
  firstName: string
  lastName: string
  password: string
  role: 'learner' | 'admin' | 'teacher'
  sendWelcomeEmail: boolean
  metadata?: {
    eduplan_person_id?: string
    source?: string
  }
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(signature: string | null, body: string, timestamp: string | null): boolean {
  if (!signature || !LMS_WEBHOOK_SECRET) {
    console.error('[EDUPLAN] Missing signature or secret')
    return false
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (Math.abs(now - webhookTime) > fiveMinutes) {
      console.error('[EDUPLAN] Timestamp too old, possible replay attack')
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
    const rateLimitKey = `eduplan:users:${ip}`

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
    let payload: EduPlanUserPayload

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
      console.error('[EDUPLAN] Invalid signature for user sync', { email: payload.email })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!payload.email) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    if (!payload.password) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: password' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    })

    if (existingUser) {
      // User exists - return their ID
      console.log('[EDUPLAN] User already exists:', payload.email)
      return NextResponse.json({
        id: existingUser.id,
        success: true,
        existing: true,
      })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(payload.password, 10)

    // Create the user
    const name = [payload.firstName, payload.lastName].filter(Boolean).join(' ') || payload.email

    const newUser = await db.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name,
        password: hashedPassword,
        role: payload.role === 'admin' ? 'ADMIN' : payload.role === 'teacher' ? 'TEACHER' : 'EMPLOYEE',
        isApproved: true, // Auto-approve users from EduPlan
        approvedAt: new Date(),
      },
    })

    // Create user stats for gamification
    await db.userStats.create({
      data: { userId: newUser.id },
    })

    // Log the webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'user_created',
          direction: 'incoming',
          status: 'success',
          requestPayload: {
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            metadata: payload.metadata,
          },
          responsePayload: { id: newUser.id, success: true },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN] User created successfully:', payload.email, '-> ID:', newUser.id)

    return NextResponse.json({
      id: newUser.id,
      success: true,
    })
  } catch (error) {
    console.error('[EDUPLAN] Error creating user:', error)

    // Log the error
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'user_created',
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
 * DELETE /api/eduplan/users
 * Delete a user from LMS when removed from EduPlan
 */
export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:users:delete:${ip}`

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
    let payload: { email: string; reason?: string }

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
      console.error('[EDUPLAN] Invalid signature for user deletion', { email: payload.email })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!payload.email) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    })

    if (!user) {
      console.log('[EDUPLAN] User not found for deletion:', payload.email)
      return NextResponse.json({
        success: true,
        message: 'User not found, nothing to delete',
      })
    }

    // Delete the user (cascades will handle related records)
    await db.user.delete({
      where: { id: user.id },
    })

    // Log the webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'user_deleted',
          direction: 'incoming',
          status: 'success',
          requestPayload: {
            email: payload.email,
            reason: payload.reason,
          },
          responsePayload: { id: user.id, success: true },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN] User deleted successfully:', payload.email)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('[EDUPLAN] Error deleting user:', error)

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
 * PATCH /api/eduplan/users
 * Update user password from EduPlan
 */
export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `eduplan:users:patch:${ip}`

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
    let payload: { email: string; password: string }

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
      console.error('[EDUPLAN] Invalid signature for password update', { email: payload.email })
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!payload.email) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    if (!payload.password) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: password' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    })

    if (!user) {
      console.log('[EDUPLAN] User not found for password update:', payload.email)
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(payload.password, 10)

    // Update the user's password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Log the webhook event
    try {
      await db.webhookEvent.create({
        data: {
          source: 'eduplan',
          eventType: 'user_password_updated',
          direction: 'incoming',
          status: 'success',
          requestPayload: {
            email: payload.email,
          },
          responsePayload: { id: user.id, success: true },
          processedAt: new Date(),
        },
      })
    } catch (logError) {
      console.error('[EDUPLAN] Failed to log webhook event:', logError)
    }

    console.log('[EDUPLAN] User password updated successfully:', payload.email)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error('[EDUPLAN] Error updating password:', error)

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
