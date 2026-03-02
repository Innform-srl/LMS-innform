import { z } from "zod"

/**
 * Environment variable validation.
 * Validates required env vars at import time so the app fails fast
 * with clear error messages if configuration is missing.
 */

const serverEnvSchema = z.object({
    // Database (required)
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Direct connection URL for Prisma migrations (bypasses pgBouncer)
    DIRECT_URL: z.string().optional(),

    // Auth (required)
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),

    // App URL - at least one must be set
    NEXTAUTH_URL: z.string().optional(),
    AUTH_URL: z.string().optional(),

    // Optional services
    RESEND_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),

    // TMS integration (optional)
    TMS_API_BASE_URL: z.string().optional(),
    TMS_SUPABASE_ANON_KEY: z.string().optional(),
    TMS_WEBHOOK_SECRET: z.string().optional(),
    LMS_WEBHOOK_SECRET: z.string().optional(),
    EDUPLAN_API_KEY: z.string().optional(),

    // Redis (optional - falls back to in-memory)
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Google Meet (optional)
    GOOGLE_MEET_CLIENT_ID: z.string().optional(),
    GOOGLE_MEET_CLIENT_SECRET: z.string().optional(),
    GOOGLE_MEET_REDIRECT_URI: z.string().optional(),

    // Alerts (optional)
    SLACK_WEBHOOK_URL: z.string().optional(),
    ALERT_EMAIL_TO: z.string().optional(),
    EMAIL_FROM: z.string().optional(),

    // Sentry (optional)
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    // Runtime
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

function validateEnv() {
    const result = serverEnvSchema.safeParse(process.env)

    if (!result.success) {
        const errors = result.error.issues
            .map(issue => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n")

        console.error(
            `\n[ENV] Missing or invalid environment variables:\n${errors}\n`
        )

        // In production, fail hard. In dev, warn but continue.
        if (process.env.NODE_ENV === "production") {
            throw new Error("Invalid environment configuration. Check server logs.")
        }
    }

    return result.success ? result.data : (process.env as unknown as z.infer<typeof serverEnvSchema>)
}

export const env = validateEnv()
