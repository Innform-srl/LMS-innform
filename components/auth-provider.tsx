"use client"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Per NextAuth v5 con Next.js basePath, dobbiamo specificare il percorso completo
    // perché il client-side non eredita automaticamente il basePath di Next.js
    return (
        <SessionProvider basePath="/lms/api/auth">
            {children}
        </SessionProvider>
    )
}
