"use client"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Per NextAuth v5 con basePath, è necessario specificare sia baseUrl che basePath
    // In produzione, baseUrl sarà il dominio completo (https://innform.eu)
    // Il basePath deve includere il percorso completo all'API auth
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXTAUTH_URL?.replace('/lms', '') || ''

    return (
        <SessionProvider
            baseUrl={baseUrl}
            basePath="/lms/api/auth"
        >
            {children}
        </SessionProvider>
    )
}
