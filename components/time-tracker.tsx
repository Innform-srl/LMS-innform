"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"

interface TimeTrackerProps {
    courseId: string
    isActive: boolean
    onTimeUpdate?: (minutes: number) => void
}

export function TimeTracker({ courseId, isActive, onTimeUpdate }: TimeTrackerProps) {
    const router = useRouter()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isPageVisible, setIsPageVisible] = useState(true)

    // Only use Page Visibility API (more reliable than window focus)
    const isTracking = isPageVisible

    // Page Visibility API
    useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden
            console.log(`[TimeTracker] 👁️ Tab: ${visible ? 'VISIBLE' : 'HIDDEN'}`)
            setIsPageVisible(visible)
        }

        requestAnimationFrame(() => setIsPageVisible(!document.hidden))
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    // Heartbeat (only when tracking)
    useEffect(() => {
        if (!isActive || !isTracking) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        console.log("[TimeTracker] ▶️ Heartbeat started")

        const sendHeartbeat = async () => {
            console.log("[TimeTracker] 💓 Heartbeat...")
            try {
                const res = await fetch(apiUrl(`/api/courses/${courseId}/track-time`), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ minutes: 1 })
                })
                if (res.ok) {
                    console.log("[TimeTracker] ✅ Tracked! (Time will update on page navigation)")
                    // Update parent component's local time
                    if (onTimeUpdate) {
                        onTimeUpdate(1)
                    }
                } else {
                    console.error("[TimeTracker] ❌ Failed:", await res.text())
                }
            } catch (error) {
                console.error("[TimeTracker] ❌ Error", error)
            }
        }

        intervalRef.current = setInterval(sendHeartbeat, 60000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, isActive, isTracking, router])

    if (!isActive) return null

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`
                px-4 py-2 rounded-lg backdrop-blur-md transition-all duration-300 shadow-lg
                ${isTracking
                    ? 'bg-green-500/20 border border-green-500/40'
                    : 'bg-orange-500/20 border border-orange-500/40'
                }
            `}>
                <div className="flex items-center gap-2 text-sm">
                    <div className={`
                        w-2.5 h-2.5 rounded-full
                        ${isTracking ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}
                    `} />
                    <span className={`font-medium ${isTracking ? 'text-green-100' : 'text-orange-100'}`}>
                        {!isPageVisible ? '⏸️ Tab nascosta' : '⏱️ Tracking attivo'}
                    </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    {isTracking ? 'Tempo conteggiato' : 'In pausa'}
                </div>
            </div>
        </div>
    )
}
