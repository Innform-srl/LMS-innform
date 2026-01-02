import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { checkRateLimit } from './lib/security'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/navigation'

const intlMiddleware = createMiddleware(routing)

export function middleware(request: NextRequest) {
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

    // Redirect root path to default locale
    // With basePath: '/lms', the pathname here is relative to basePath
    // So '/' means '/lms' was requested
    const pathname = request.nextUrl.pathname
    if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/it'
        return NextResponse.redirect(url)
    }

    // Handle i18n for non-API routes
    return intlMiddleware(request)
}

// Configure which routes use this middleware
export const config = {
    matcher: [
        // Match root path explicitly
        '/',
        // Match all pathnames except for
        // - … if they start with `/api`, `/_next` or `/_vercel`
        // - … the ones containing a dot (e.g. `favicon.ico`)
        '/((?!api|_next|_vercel|.*\\..*).*)',
        // Match API routes for rate limiting
        '/api/:path*'
    ]
}
