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
    basePath: "/api/auth",
    providers: [
        Credentials({
            async authorize(credentials, request) {
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
                            // Block soft-deleted users (defense-in-depth, middleware also filters)
                            if ((user as unknown as { deletedAt: Date | null }).deletedAt) {
                                return null
                            }
                            if (!(user as unknown as { isApproved: boolean }).isApproved) {
                                return null
                            }
                            // Extract IP and User-Agent from request headers
                            const ipAddress = request?.headers?.get?.('x-forwarded-for')
                                || request?.headers?.get?.('x-real-ip')
                                || 'unknown'
                            const userAgent = request?.headers?.get?.('user-agent')
                                || 'unknown'

                            // Create audit log without blocking
                            db.auditLog.create({
                                data: {
                                    userId: user.id,
                                    action: "LOGIN",
                                    entityType: "User",
                                    entityId: user.id,
                                    ipAddress,
                                    userAgent,
                                }
                            }).catch((error) => {
                                console.error("Failed to create login audit log:", error)
                            })
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
                session.user.role = token.role as "ADMIN" | "EMPLOYEE" | "TEACHER"
            }
            return session
        },
        async jwt({ token, user }) {
            // Only fetch from DB on initial login (when user object is present)
            // Otherwise use cached role from token
            if (user) {
                token.role = (user as unknown as { role: string }).role
            }
            return token
        }
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
})
