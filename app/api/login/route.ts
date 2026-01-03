import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import * as jose from "jose"

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

        // Crea il token JWT compatibile con Auth.js
        const secret = process.env.AUTH_SECRET!
        // Auth.js deriva la chiave usando HKDF
        const encoder = new TextEncoder()
        const keyMaterial = encoder.encode(secret)
        const hkdfKey = await crypto.subtle.importKey(
            "raw",
            keyMaterial,
            "HKDF",
            false,
            ["deriveBits"]
        )
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: encoder.encode(cookieName),
                info: encoder.encode("Auth.js Generated Encryption Key"),
            },
            hkdfKey,
            512 // A256CBC-HS512 richiede 512 bit
        )
        const encryptionKey = new Uint8Array(derivedBits)

        const now = Math.floor(Date.now() / 1000)
        const maxAge = 30 * 24 * 60 * 60 // 30 giorni

        const token = await new jose.EncryptJWT({
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            iat: now,
            exp: now + maxAge,
        })
            .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
            .encrypt(encryptionKey)

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
