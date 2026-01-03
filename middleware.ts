import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { checkRateLimit } from './lib/security'

const PRODUCTION_DOMAIN = 'innform.eu'

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || ''

    // Redirect from Vercel domain to production domain
    if (
        process.env.NODE_ENV === 'production' &&
        hostname.includes('vercel.app') &&
        !hostname.includes(PRODUCTION_DOMAIN)
    ) {
        const url = request.nextUrl.clone()
        url.host = PRODUCTION_DOMAIN
        url.protocol = 'https'
        return NextResponse.redirect(url, { status: 301 })
    }

    // Rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ip = (request as any).ip || forwardedFor || 'unknown'

        // Different limits for different endpoints
        let maxRequests = 100
        let windowMs = 60 * 1000 // 1 minute

        // Stricter limits for auth endpoints
        if (request.nextUrl.pathname.startsWith('/api/auth')) {
            maxRequests = 10
            windowMs = 60 * 1000
        }

        // Stricter limits for cron endpoints
        if (request.nextUrl.pathname.startsWith('/api/cron')) {
            // Cron endpoints should have secret auth, but also rate limit
            maxRequests = 5
            windowMs = 60 * 1000
        }

        const rateLimitKey = `${ip}:${request.nextUrl.pathname}`
        const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, maxRequests, windowMs)

        if (!allowed) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Too many requests',
                    message: 'Please try again later'
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
                        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString()
                    }
                }
            )
        }

        // Add rate limit headers to response
        const response = NextResponse.next()
        response.headers.set('X-RateLimit-Limit', maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', remaining.toString())
        response.headers.set('X-RateLimit-Reset', new Date(resetAt).toISOString())

        return response
    }

    return NextResponse.next()
}

// Configure which routes use this middleware
export const config = {
    matcher: [
        // Match all routes for domain redirect
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ]
}
