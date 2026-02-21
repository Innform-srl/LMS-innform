import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exchangeCodeForTokens } from "@/lib/google-meet-api"

/**
 * GET /api/auth/google-meet/callback
 * Riceve il codice OAuth2 da Google e salva i token nel DB
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/lms/dashboard", request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state") // sessionId opzionale

  if (error || !code) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(
      new URL(`/lms/admin/settings?error=google-meet-auth-failed`, request.url)
    )
  }

  try {
    // Scambia il code con i token
    const tokens = await exchangeCodeForTokens(code)

    // Salva i token nelle impostazioni di sistema
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await db.systemSetting.upsert({
      where: { key: "google_meet_tokens" },
      create: {
        key: "google_meet_tokens",
        value: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString()
        })
      },
      update: {
        value: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString()
        })
      }
    })

    // Redirect con successo
    const redirectUrl = state
      ? `/lms/admin/live-sessions/${state}/attendance?google-meet-connected=true`
      : `/lms/admin/settings?google-meet-connected=true`

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (err) {
    console.error("Google Meet OAuth callback error:", err)
    return NextResponse.redirect(
      new URL(`/lms/admin/settings?error=google-meet-token-failed`, request.url)
    )
  }
}
