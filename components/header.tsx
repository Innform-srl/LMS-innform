"use client"

import { GlobalSearch } from "./global-search"
import { NotificationCenter } from "./notifications"
import { ThemeToggle } from "./theme-toggle"

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <div className="flex-1">
                <GlobalSearch />
            </div>
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <NotificationCenter />
            </div>
        </header>
    )
}
