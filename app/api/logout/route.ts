import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
    try {
        const isProduction = process.env.NODE_ENV === "production"
        const cookieName = isProduction
            ? "__Secure-authjs.session-token"
            : "authjs.session-token"

        const cookieStore = await cookies()

        // Cancella il cookie di sessione
        cookieStore.delete(cookieName)

        // Cancella anche altri cookie Auth.js se presenti
        cookieStore.delete("authjs.callback-url")
        cookieStore.delete("authjs.csrf-token")
        if (isProduction) {
            cookieStore.delete("__Secure-authjs.callback-url")
            cookieStore.delete("__Host-authjs.csrf-token")
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[LOGOUT] Error:", error)
        return NextResponse.json(
            { error: "Errore durante il logout" },
            { status: 500 }
        )
    }
}

export async function GET() {
    return POST()
}
