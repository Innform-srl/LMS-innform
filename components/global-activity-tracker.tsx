"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { recordUserActivity } from "@/app/actions/gamification"

export function GlobalActivityTracker() {
    const pathname = usePathname()

    useEffect(() => {
        // Only track on course pages
        if (!pathname?.startsWith('/courses/')) return

        // Record activity on mount and route change
        const record = async () => {
            try {
                await recordUserActivity()
            } catch (error) {
                // Silent fail
                console.error("Failed to record activity", error)
            }
        }

        record()

        // Optional: Set up an interval to record activity while staying on the same page
        // e.g., every 5 minutes
        const interval = setInterval(record, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [pathname])

    return null
}
