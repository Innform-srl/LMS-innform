import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
    try {
        const cookieStore = await cookies()

        // Lista di tutti i possibili nomi di cookie Auth.js
        const cookieNames = [
            // Development
            "authjs.session-token",
            "authjs.callback-url",
            "authjs.csrf-token",
            // Production (Secure)
            "__Secure-authjs.session-token",
            "__Secure-authjs.callback-url",
            "__Host-authjs.csrf-token",
            // Next-Auth legacy names
            "next-auth.session-token",
            "__Secure-next-auth.session-token",
        ]

        // Cancella tutti i cookie con diverse opzioni di path
        const paths = ["/", "/lms", "/lms/"]

        for (const name of cookieNames) {
            // Prova a cancellare con diversi path
            for (const path of paths) {
                try {
                    cookieStore.set(name, "", {
                        expires: new Date(0),
                        path: path,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax"
                    })
                } catch {
                    // Ignora errori per cookie non esistenti
                }
            }
            // Cancella anche con il metodo delete
            try {
                cookieStore.delete(name)
            } catch {
                // Ignora
            }
        }

        const response = NextResponse.json({ success: true })

        // Imposta anche gli header Set-Cookie per assicurarsi che vengano cancellati
        const expiredDate = "Thu, 01 Jan 1970 00:00:00 GMT"
        for (const name of cookieNames) {
            response.headers.append(
                "Set-Cookie",
                `${name}=; Path=/lms; Expires=${expiredDate}; HttpOnly; SameSite=Lax`
            )
            response.headers.append(
                "Set-Cookie",
                `${name}=; Path=/; Expires=${expiredDate}; HttpOnly; SameSite=Lax`
            )
        }

        return response
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
