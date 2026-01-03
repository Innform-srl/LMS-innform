import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { encode } from "@auth/core/jwt"

export async function POST(request: Request) {
    try {
        console.log("[LOGIN] Starting login request")
        const { email, password } = await request.json()
        console.log("[LOGIN] Email:", email)

        if (!email || !password) {
            console.log("[LOGIN] Missing email or password")
            return NextResponse.json(
                { error: "Email e password richiesti" },
                { status: 400 }
            )
        }

        console.log("[LOGIN] Looking up user in database...")
        const user = await db.user.findUnique({ where: { email } })
        console.log("[LOGIN] User found:", user ? "yes" : "no")

        if (!user || !user.password) {
            console.log("[LOGIN] User not found or no password")
            return NextResponse.json(
                { error: "Credenziali non valide" },
                { status: 401 }
            )
        }

        console.log("[LOGIN] Comparing passwords...")
        const passwordMatch = await bcrypt.compare(password, user.password)
        console.log("[LOGIN] Password match:", passwordMatch)

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Credenziali non valide" },
                { status: 401 }
            )
        }

        console.log("[LOGIN] Checking isApproved:", (user as any).isApproved)
        if (!(user as any).isApproved) {
            return NextResponse.json(
                { error: "Account non ancora approvato" },
                { status: 403 }
            )
        }

        // Auth.js usa nomi diversi in base all'ambiente
        const isProduction = process.env.NODE_ENV === "production"
        const cookieName = isProduction
            ? "__Secure-authjs.session-token"
            : "authjs.session-token"

        // Crea il token JWT usando @auth/core/jwt
        const secret = process.env.AUTH_SECRET!
        const maxAge = 30 * 24 * 60 * 60 // 30 giorni

        const token = await encode({
            token: {
                sub: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            secret,
            salt: cookieName,
            maxAge,
        })

        // Crea audit log
        try {
            await db.auditLog.create({
                data: {
                    userId: user.id,
                    action: "LOGIN",
                    entityType: "User",
                    entityId: user.id,
                    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                    userAgent: request.headers.get("user-agent") || "unknown"
                }
            })
        } catch (e) {
            console.error("Failed to create audit log:", e)
        }

        // Imposta il cookie di sessione
        const cookieStore = await cookies()
        cookieStore.set(cookieName, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: maxAge,
        })

        return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    } catch (error) {
        console.error("[LOGIN] Error:", error)
        console.error("[LOGIN] Error stack:", error instanceof Error ? error.stack : "no stack")
        return NextResponse.json(
            { error: "Errore durante il login", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
