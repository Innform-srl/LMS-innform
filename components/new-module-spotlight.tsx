"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, Sparkles } from "lucide-react"

interface NewModuleSpotlightProps {
    moduleId: string
    moduleTitle: string
    contentType: string | null
    /** CSS selector for the element to spotlight */
    targetSelector: string
    /** URL to navigate to, or callback */
    onAction?: () => void
    href?: string
}

function getNewModuleMessage(contentType: string | null) {
    switch (contentType) {
        case "LIVE": return "Nuova Sessione Live"
        case "PDF": return "Nuovo PDF caricato"
        default: return "Nuovo Video caricato"
    }
}

function ContentIcon({ type }: { type: string | null }) {
    if (type === "LIVE") return (
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </div>
    )
    if (type === "PDF") return (
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        </div>
    )
    return (
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
    )
}

export function NewModuleSpotlight({
    moduleId,
    moduleTitle,
    contentType,
    targetSelector,
    onAction,
    href,
}: NewModuleSpotlightProps) {
    const [show, setShow] = useState(false)
    const [rect, setRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        const key = `new-module-popup-${moduleId}`
        const count = parseInt(localStorage.getItem(key) || "0", 10)
        if (count >= 2) return

        // Small delay to let the page render and elements settle
        const timeout = setTimeout(() => {
            const el = document.querySelector(targetSelector)
            if (!el) return

            localStorage.setItem(key, String(count + 1))

            // Elevate the target above the overlay
            const htmlEl = el as HTMLElement
            htmlEl.style.position = "relative"
            htmlEl.style.zIndex = "101"

            setRect(el.getBoundingClientRect())
            setShow(true)

            const handleResize = () => {
                const r = el.getBoundingClientRect()
                setRect(r)
            }
            window.addEventListener("resize", handleResize)
            return () => window.removeEventListener("resize", handleResize)
        }, 400)

        return () => clearTimeout(timeout)
    }, [moduleId, targetSelector])

    const close = useCallback(() => {
        setShow(false)
        // Reset z-index on target
        const el = document.querySelector(targetSelector) as HTMLElement | null
        if (el) {
            el.style.zIndex = ""
        }
    }, [targetSelector])

    const handleAction = () => {
        if (onAction) onAction()
        if (href) window.location.href = href
        close()
    }

    if (!show || !rect) return null

    // Decide card position: left of target if enough space, otherwise below
    const spaceLeft = rect.left
    const cardWidth = 280
    const positionLeft = spaceLeft > cardWidth + 32

    return (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
            {/* Semi-transparent dark background */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={close}
            />
            {/* Floating message card */}
            <div
                className="absolute animate-in slide-in-from-right-4 fade-in duration-500"
                style={positionLeft ? {
                    top: rect.top + rect.height / 2,
                    left: rect.left - 16,
                    transform: 'translate(-100%, -50%)',
                } : {
                    top: rect.bottom + 12,
                    left: Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
                }}
            >
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative" style={{ width: cardWidth }}>
                    {/* Arrow */}
                    {positionLeft && (
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-card border-r border-t border-border rotate-45" />
                    )}
                    {!positionLeft && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-l border-t border-border rotate-45" />
                    )}
                    <button
                        onClick={close}
                        className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <div className="flex items-start gap-3">
                        <ContentIcon type={contentType} />
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-foreground">
                                {getNewModuleMessage(contentType)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {moduleTitle}
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleAction}
                        className="w-full mt-4"
                    >
                        Vai al modulo
                    </Button>
                </div>
            </div>
        </div>
    )
}
