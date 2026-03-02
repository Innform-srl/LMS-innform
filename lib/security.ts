/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize HTML string to prevent XSS
 * For server-side use. For client-side, consider using DOMPurify
 */
export function sanitizeHtml(input: string): string {
    if (!input) return ''

    // Basic HTML entity encoding
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/[\/\\]/g, '') // Remove path separators
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
}

/**
 * Check if string contains potential XSS
 */
export function hasXss(input: string): boolean {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
    ]

    return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * Sanitize and validate user input for text fields
 */
export function sanitizeTextInput(input: string, options?: {
    maxLength?: number
    allowHtml?: boolean
}): { valid: boolean; sanitized: string; error?: string } {
    if (!input) {
        return { valid: true, sanitized: '' }
    }

    // Check length
    if (options?.maxLength && input.length > options.maxLength) {
        return {
            valid: false,
            sanitized: input.slice(0, options.maxLength),
            error: `Input troppo lungo (massimo ${options.maxLength} caratteri)`
        }
    }

    // Check for XSS
    if (hasXss(input)) {
        return {
            valid: false,
            sanitized: sanitizeHtml(input),
            error: 'Input contiene codice potenzialmente pericoloso'
        }
    }

    // Sanitize if HTML not allowed
    const sanitized = options?.allowHtml ? input : sanitizeHtml(input)

    return { valid: true, sanitized }
}

/**
 * Rate limit check helper
 * Uses Upstash Redis in production (UPSTASH_REDIS_REST_URL set),
 * falls back to in-memory for local development.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const useUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// Upstash rate limiters (created lazily per config)
const upstashLimiters = new Map<string, Ratelimit>()

function getUpstashLimiter(maxRequests: number, windowMs: number): Ratelimit {
    const key = `${maxRequests}:${windowMs}`
    let limiter = upstashLimiters.get(key)
    if (!limiter) {
        limiter = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
            analytics: true,
        })
        upstashLimiters.set(key, limiter)
    }
    return limiter
}

// In-memory fallback for local development
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimitInMemory(
    identifier: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const record = rateLimitMap.get(identifier)

    if (Math.random() < 0.01) {
        for (const [key, value] of rateLimitMap.entries()) {
            if (value.resetAt < now) {
                rateLimitMap.delete(key)
            }
        }
    }

    if (!record || record.resetAt < now) {
        const resetAt = now + windowMs
        rateLimitMap.set(identifier, { count: 1, resetAt })
        return { allowed: true, remaining: maxRequests - 1, resetAt }
    }

    if (record.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: record.resetAt }
    }

    record.count++
    return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt }
}

export async function checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (useUpstash) {
        try {
            const limiter = getUpstashLimiter(maxRequests, windowMs)
            const result = await limiter.limit(identifier)
            return {
                allowed: result.success,
                remaining: result.remaining,
                resetAt: result.reset,
            }
        } catch (error) {
            console.error('Upstash rate limit error, falling back to in-memory:', error)
            return checkRateLimitInMemory(identifier, maxRequests, windowMs)
        }
    }

    return checkRateLimitInMemory(identifier, maxRequests, windowMs)
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
}
