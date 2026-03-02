"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { GlobalActivityTracker } from "@/components/global-activity-tracker"
import { Header } from "./header"
import { PWAInstallPrompt } from "./pwa-install-prompt"

interface ClientLayoutProps {
    children: React.ReactNode
    user?: {
        name?: string | null
        email?: string | null
        role: "ADMIN" | "EMPLOYEE" | "TEACHER"
    } | null
}

export function ClientLayout({ children, user }: ClientLayoutProps) {
    const pathname = usePathname()

    // Paths where sidebar should be hidden
    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/api")

    if (isAuthPage || !user) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen bg-background">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2">
                Vai al contenuto principale
            </a>
            <GlobalActivityTracker />
            <Sidebar user={user} />
            <main id="main-content" className="flex-1 md:pl-72 transition-all duration-300 flex flex-col">
                <Header />
                <div className="flex-1">
                    {children}
                </div>
            </main>
            <PWAInstallPrompt />
        </div>
    )
}
