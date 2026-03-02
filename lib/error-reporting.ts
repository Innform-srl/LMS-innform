import * as Sentry from "@sentry/nextjs"

/**
 * Report an error to Sentry with optional context.
 * Safe to call even if Sentry is not configured (DSN not set).
 * Does NOT replace console.error — use alongside it.
 */
export function reportError(error: unknown, context?: Record<string, string>) {
    if (context) {
        Sentry.withScope((scope) => {
            for (const [key, value] of Object.entries(context)) {
                scope.setTag(key, value)
            }
            Sentry.captureException(error)
        })
    } else {
        Sentry.captureException(error)
    }
}
