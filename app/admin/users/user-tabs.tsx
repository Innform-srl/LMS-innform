"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function UserTabs() {
    const pathname = usePathname()

    const tabs = [
        {
            name: "Utenti",
            href: "/admin/users",
            active: pathname === "/admin/users" || pathname === "/admin/users/create" || pathname.startsWith("/admin/users/") && !pathname.includes("departments") && !pathname.includes("companies")
        },
        {
            name: "Dipartimenti",
            href: "/admin/users/departments",
            active: pathname.includes("/admin/users/departments")
        },
        {
            name: "Aziende",
            href: "/admin/users/companies",
            active: pathname.includes("/admin/users/companies")
        }
    ]

    return (
        <div className="border-b border-border mb-8">
            <div className="flex gap-6">
                {tabs.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={cn(
                            "pb-4 text-sm font-medium transition-colors relative",
                            tab.active
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.name}
                        {tab.active && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    )
}
