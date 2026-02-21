"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Check if already dismissed this session
        if (sessionStorage.getItem("pwa-install-dismissed")) {
            setDismissed(true)
            return
        }

        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener("beforeinstallprompt", handler)
        return () => window.removeEventListener("beforeinstallprompt", handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") {
            setDeferredPrompt(null)
        }
    }

    const handleDismiss = () => {
        setDismissed(true)
        sessionStorage.setItem("pwa-install-dismissed", "1")
    }

    if (!deferredPrompt || dismissed) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-card border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary-foreground text-lg">L</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Installa LMS Innform</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Accedi rapidamente dal tuo dispositivo
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={handleInstall} className="h-8 text-xs">
                            <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                            Installa
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs">
                            Non ora
                        </Button>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleDismiss}
                    aria-label="Chiudi"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    )
}
