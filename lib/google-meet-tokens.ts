import { db } from "@/lib/db"
import { refreshAccessToken } from "@/lib/google-meet-api"

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Recupera un access_token valido dal DB, rinnovandolo se scaduto
 */
export async function getValidAccessToken(): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "google_meet_tokens" }
  })

  if (!setting) return null

  const tokens: StoredTokens = JSON.parse(setting.value)
  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  // Se il token scade tra meno di 5 minuti, lo rinnova
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

      const updatedTokens: StoredTokens = {
        access_token: refreshed.access_token,
        refresh_token: tokens.refresh_token, // refresh_token non cambia
        expires_at: newExpiresAt.toISOString()
      }

      await db.systemSetting.update({
        where: { key: "google_meet_tokens" },
        data: { value: JSON.stringify(updatedTokens) }
      })

      return refreshed.access_token
    } catch (err) {
      console.error("Token refresh failed:", err)
      return null
    }
  }

  return tokens.access_token
}

/**
 * Verifica se l'integrazione Google Meet è configurata
 */
export async function isGoogleMeetConnected(): Promise<boolean> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "google_meet_tokens" }
  })
  return !!setting
}

/**
 * Rimuove i token (disconnette Google Meet)
 */
export async function disconnectGoogleMeet(): Promise<void> {
  await db.systemSetting.deleteMany({
    where: { key: "google_meet_tokens" }
  })
}
