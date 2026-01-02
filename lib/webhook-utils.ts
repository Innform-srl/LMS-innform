/**
 * Webhook utilities for TMS integration
 * Handles signature verification, event validation, and webhook processing
 */

import crypto from 'crypto'

// Environment variables
const TMS_WEBHOOK_SECRET = process.env.TMS_WEBHOOK_SECRET || ''
const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET || ''
const TMS_API_BASE_URL = process.env.TMS_API_BASE_URL || ''
const TMS_SUPABASE_ANON_KEY = process.env.TMS_SUPABASE_ANON_KEY || ''

// Webhook event types from TMS
export type TMSWebhookEventType =
  | 'enrollment_created'
  | 'enrollment_cancelled'
  | 'enrollment_updated'
  | 'user_created'
  | 'user_updated'
  | 'course_mapping_updated'

// Webhook event types to TMS
export type LMSWebhookEventType =
  | 'first_login'
  | 'progress_updated'
  | 'quiz_completed'
  | 'badge_earned'
  | 'course_completed'
  | 'certificate_issued'
  | 'certificate_revoked'
  | 'inactivity_alert'

// Payload interfaces for incoming webhooks
export interface TMSEnrollmentPayload {
  enrollment_id: string
  tms_user_id?: string  // TMS user ID for tracking
  user: {
    email: string
    first_name: string
    last_name: string
    company?: string
    job_title?: string
    language?: string
  }
  course: {
    code: string
    lms_course_id?: string
    title: string
    start_date?: string
    end_date?: string
  }
  organization?: {
    id: string
    name: string
    tenant_id?: string
  }
}

export interface TMSUserPayload {
  email: string
  first_name?: string
  last_name?: string
  company?: string
  job_title?: string
  changes?: Record<string, unknown>
}

export interface TMSWebhookEvent {
  event: TMSWebhookEventType
  timestamp: string
  signature?: string
  data: TMSEnrollmentPayload | TMSUserPayload
}

// Payload interfaces for outgoing webhooks
export interface LMSProgressPayload {
  event: 'progress_updated'
  user_email: string
  course_id: string
  tms_enrollment_id?: string
  progress: {
    percentage: number
    modules_completed: number
    modules_total: number
    time_spent_minutes: number
    last_activity: string
    current_module?: {
      id: string
      name: string
      type: string
    }
  }
}

export interface LMSQuizPayload {
  event: 'quiz_completed'
  user_email: string
  course_id: string
  quiz: {
    id: string
    name: string
    score: number
    passed: boolean
    passing_score: number
    attempts: number
    time_taken_seconds: number
  }
}

export interface LMSBadgePayload {
  event: 'badge_earned'
  user_email: string
  badge: {
    id: string
    name: string
    description: string
    icon_url: string
    points: number
    category: string
  }
}

export interface LMSCertificatePayload {
  event: 'certificate_issued' | 'certificate_revoked'
  certificate: {
    id: string
    user_email: string
    user_name: string
    course_id: string
    course_name: string
    issue_date: string
    expiry_date?: string
    score: number
    time_spent_minutes: number
    modules_completed: number
    certificate_url: string
    pdf_url: string
    verification_code: string
    badges: Array<{
      id: string
      name: string
      icon: string
      date: string
    }>
    learning_path?: {
      id: string
      name: string
    }
  }
}

export interface LMSActivityPayload {
  event: 'first_login' | 'inactivity_alert'
  user_email: string
  timestamp?: string
  metadata?: Record<string, unknown>
  course_id?: string
  days_inactive?: number
  last_activity?: string
  progress_at_last_activity?: number
}

export interface LMSCourseCompletedPayload {
  event: 'course_completed'
  user_email: string
  course_id: string
  tms_enrollment_id?: string
  completion: {
    date: string
    final_score: number
    time_spent_minutes: number
    modules_completed: number
    quizzes_passed: number
    quizzes_total: number
  }
}

export type LMSWebhookPayload =
  | LMSProgressPayload
  | LMSQuizPayload
  | LMSBadgePayload
  | LMSCertificatePayload
  | LMSActivityPayload
  | LMSCourseCompletedPayload

/**
 * Verify HMAC-SHA256 signature from TMS webhook
 */
export function verifyTMSWebhookSignature(
  signature: string | null,
  body: string,
  timestamp: string | null
): boolean {
  if (!signature || !TMS_WEBHOOK_SECRET) {
    console.error('[WEBHOOK] Missing signature or secret')
    return false
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (Math.abs(now - webhookTime) > fiveMinutes) {
      console.error('[WEBHOOK] Timestamp too old, possible replay attack')
      return false
    }
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', TMS_WEBHOOK_SECRET)
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

/**
 * Generate HMAC-SHA256 signature for outgoing webhooks to TMS
 */
export function generateLMSWebhookSignature(payload: string): string {
  if (!TMS_WEBHOOK_SECRET) {
    throw new Error('TMS_WEBHOOK_SECRET not configured')
  }

  const signature = crypto
    .createHmac('sha256', TMS_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return `sha256=${signature}`
}

/**
 * Send webhook to TMS
 */
export async function sendWebhookToTMS(
  endpoint: string,
  payload: LMSWebhookPayload
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  if (!TMS_API_BASE_URL) {
    console.warn('[WEBHOOK] TMS_API_BASE_URL not configured, skipping webhook')
    return { success: false, error: 'TMS_API_BASE_URL not configured' }
  }

  const payloadString = JSON.stringify(payload)
  const timestamp = new Date().toISOString()

  try {
    const signature = generateLMSWebhookSignature(payloadString)

    const response = await fetch(`${TMS_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TMS_SUPABASE_ANON_KEY}`,
        'X-LMS-Signature': signature,
        'X-LMS-Timestamp': timestamp,
      },
      body: payloadString,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[WEBHOOK] TMS responded with ${response.status}: ${errorText}`)
      return {
        success: false,
        error: `TMS responded with ${response.status}: ${errorText}`,
      }
    }

    const responseData = await response.json()
    return { success: true, response: responseData }
  } catch (error) {
    console.error('[WEBHOOK] Failed to send webhook to TMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate required fields in webhook payload
 */
export function validateWebhookPayload(
  event: TMSWebhookEventType,
  data: unknown
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be an object' }
  }

  switch (event) {
    case 'enrollment_created':
    case 'enrollment_updated': {
      const payload = data as Partial<TMSEnrollmentPayload>
      if (!payload.user?.email) {
        return { valid: false, error: 'Missing user.email' }
      }
      if (!payload.course?.code && !payload.course?.lms_course_id) {
        return { valid: false, error: 'Missing course.code or course.lms_course_id' }
      }
      break
    }

    case 'enrollment_cancelled': {
      const payload = data as Partial<TMSEnrollmentPayload>
      if (!payload.user?.email) {
        return { valid: false, error: 'Missing user.email' }
      }
      break
    }

    case 'user_created':
    case 'user_updated': {
      const payload = data as Partial<TMSUserPayload>
      if (!payload.email) {
        return { valid: false, error: 'Missing email' }
      }
      break
    }

    case 'course_mapping_updated':
      // Minimal validation for course mapping
      break

    default:
      return { valid: false, error: `Unknown event type: ${event}` }
  }

  return { valid: true }
}

/**
 * Error codes for webhook responses
 */
export const WebhookErrorCodes = {
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  COURSE_NOT_MAPPED: 'COURSE_NOT_MAPPED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  RATE_LIMITED: 'RATE_LIMITED',
  DUPLICATE_EVENT: 'DUPLICATE_EVENT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type WebhookErrorCode = (typeof WebhookErrorCodes)[keyof typeof WebhookErrorCodes]

/**
 * Create standardized webhook error response
 */
export function createWebhookErrorResponse(
  code: WebhookErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    request_id: crypto.randomUUID(),
  }
}

/**
 * Create standardized webhook success response
 */
export function createWebhookSuccessResponse(data?: Record<string, unknown>) {
  return {
    success: true,
    ...data,
    request_id: crypto.randomUUID(),
  }
}
