import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

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
                    const { email: rawEmail, password } = parsedCredentials.data
                    const email = rawEmail.toLowerCase() // Normalize email to lowercase

                    try {
                        const user = await db.user.findUnique({ where: { email } })

                        if (!user || !user.password) {
                            return null
                        }

                        const passwordsMatch = await bcrypt.compare(password, user.password)
                        if (passwordsMatch) {
                            if (!(user as any).isApproved) {
                                return null
                            }
                            // Create audit log without blocking
                            db.auditLog.create({
                                data: {
                                    userId: user.id,
                                    action: "LOGIN",
                                    entityType: "User",
                                    entityId: user.id,
                                    ipAddress: "127.0.0.1",
                                    userAgent: "Browser"
                                }
                            }).catch(() => {})
                            return user
                        }
                        return null
                    } catch (error) {
                        console.error("Auth error:", error)
                        return null
                    }
                }
                return null
            },
        }),
    ],
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
        async jwt({ token, user }) {
            // Only fetch from DB on initial login (when user object is present)
            // Otherwise use cached role from token
            if (user) {
                token.role = (user as any).role
            }
            return token
        }
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
})
