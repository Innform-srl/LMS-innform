import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import fs from "fs"

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = loginSchema.safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data
                    console.log("Attempting login for:", email)
                    try {
                        fs.appendFileSync("auth-debug.txt", `Attempting login for: ${email}\n`)
                    } catch (e) { }

                    try {
                        const user = await db.user.findUnique({ where: { email } })

                        if (!user) {
                            console.log("User not found")
                            try { fs.appendFileSync("auth-debug.txt", "User not found\n") } catch (e) { }
                            return null
                        }

                        if (!user.password) {
                            console.log("User has no password")
                            try { fs.appendFileSync("auth-debug.txt", "User has no password\n") } catch (e) { }
                            return null
                        }

                        const passwordsMatch = await bcrypt.compare(password, user.password)
                        if (passwordsMatch) {
                            if (!(user as any).isApproved) {
                                console.log("User not approved")
                                return null
                            }
                            console.log("Login successful")
                            try {
                                await db.auditLog.create({
                                    data: {
                                        userId: user.id,
                                        action: "LOGIN",
                                        entityType: "User",
                                        entityId: user.id,
                                        ipAddress: "127.0.0.1", // Placeholder
                                        userAgent: "Browser" // Placeholder
                                    }
                                })
                            } catch (e) {
                                console.error("Failed to create audit log:", e)
                            }
                            return user
                        } else {
                            console.log("Invalid password")
                            try { fs.appendFileSync("auth-debug.txt", "Invalid password\n") } catch (e) { }
                            return null
                        }
                    } catch (error) {
                        console.error("Auth error:", error)
                        try { fs.appendFileSync("auth-debug.txt", `Auth error: ${error}\n`) } catch (e) { }
                        return null
                    }
                }
                console.log("Invalid credentials format")
                return null
            },
        }),
    ],
    basePath: "/lms/api/auth",
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role as "ADMIN" | "EMPLOYEE"
            }
            return session
        },
        async jwt({ token }) {
            if (!token.sub) return token

            const existingUser = await db.user.findUnique({
                where: { id: token.sub }
            })

            if (!existingUser) return token

            token.role = existingUser.role
            return token
        }
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
})
