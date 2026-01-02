"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { GlobalActivityTracker } from "@/components/global-activity-tracker"
import { Header } from "./header"

interface ClientLayoutProps {
    children: React.ReactNode
    user?: {
        name?: string | null
        email?: string | null
        role: "ADMIN" | "EMPLOYEE"
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
            <GlobalActivityTracker />
            <Sidebar user={user} />
            <main className="flex-1 md:pl-72 transition-all duration-300 flex flex-col">
                <Header />
                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}
