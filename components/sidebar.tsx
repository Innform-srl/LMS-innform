"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    BookOpen,
    Gamepad2,
    BarChart2,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    GraduationCap,
    Building2,
    Award,
    Video
} from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationCenter } from "@/components/notifications"

interface SidebarProps {
    user: {
        name?: string | null
        email?: string | null
        role: "ADMIN" | "EMPLOYEE"
    }
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/",
            color: "text-primary",
        },
        {
            label: "Corsi",
            icon: BookOpen,
            href: "/courses",
            color: "text-primary",
        },
        {
            label: "Gamification",
            icon: Gamepad2,
            href: "/gamification",
            color: "text-primary",
        },
        {
            label: "I miei Certificati",
            icon: Award,
            href: "/certificates",
            color: "text-primary",
        },
    ]

    const adminRoutes = [
        {
            label: "Admin Dashboard",
            icon: LayoutDashboard,
            href: "/admin",
            color: "text-primary",
        },
        {
            label: "Gestione Corsi",
            icon: BookOpen,
            href: "/admin/courses",
            color: "text-primary",
        },
        {
            label: "Gestione Utenti",
            icon: Users,
            href: "/admin/users",
            color: "text-primary",
        },
        {
            label: "Gestione Certificati",
            icon: Award,
            href: "/admin/certificates",
            color: "text-primary",
        },
        {
            label: "Percorsi",
            icon: GraduationCap,
            href: "/admin/learning-paths",
            color: "text-primary",
        },
        {
            label: "Aziende",
            icon: Building2,
            href: "/admin/users/companies",
            color: "text-primary",
        },
        {
            label: "Aula Virtuale",
            icon: Video,
            href: "/admin/live-sessions",
            color: "text-primary",
        },
        {
            label: "Analytics",
            icon: BarChart2,
            href: "/admin/analytics",
            color: "text-primary",
        },
    ]

    return (
        <>
            {/* Mobile Trigger */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background/50 backdrop-blur-md border border-border">
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="px-6 py-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="font-bold text-primary-foreground">L</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">
                                LMS Innform
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 px-4 space-y-2 overflow-y-auto">
                        <div className="mb-4">
                            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Dashboard
                            </h3>
                            {routes.map((route) => (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                        pathname === route.href
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    <route.icon className={cn("h-5 w-5", route.color)} />
                                    <span className="font-medium">{route.label}</span>
                                    {pathname === route.href && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </Link>
                            ))}
                        </div>

                        {user.role === "ADMIN" && (
                            <div className="mb-4 pt-4 border-t border-white/10">
                                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Amministrazione
                                </h3>
                                {adminRoutes.map((route) => (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                            pathname === route.href
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                        )}
                                    >
                                        <route.icon className={cn("h-5 w-5", route.color)} />
                                        <span className="font-medium">{route.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <div className="p-4 border-t border-border bg-accent/10">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {user.name || "Utente"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Link href="/settings">
                                <Button variant="outline" size="sm" className="w-full border-border hover:bg-accent hover:text-accent-foreground text-xs">
                                    <Settings className="h-3 w-3 mr-2" />
                                    Impostazioni
                                </Button>
                            </Link>
                            <a href="/lms/api/auth/signout?callbackUrl=/lms/login" className="w-full">
                                <Button variant="outline" size="sm" className="w-full border-border hover:bg-accent hover:text-destructive hover:border-destructive/20 text-xs">
                                    <LogOut className="h-3 w-3 mr-2" />
                                    Esci
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}
