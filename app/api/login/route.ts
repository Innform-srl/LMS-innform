import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { encode } from "@auth/core/jwt"

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e password richiesti" },
                { status: 400 }
            )
        }

        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.password) {
            return NextResponse.json(
                { error: "Credenziali non valide" },
                { status: 401 }
            )
        }

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Credenziali non valide" },
                { status: 401 }
            )
        }

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
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "Errore durante il login" },
            { status: 500 }
        )
    }
}
