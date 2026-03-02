"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Application error:", error)
        Sentry.captureException(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Si è verificato un errore</h2>
                <p className="text-muted-foreground max-w-md">
                    Qualcosa è andato storto. Riprova o torna alla dashboard.
                </p>
            </div>
            <div className="flex gap-3">
                <Button onClick={reset} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Riprova
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/lms"}>
                    Torna alla Dashboard
                </Button>
            </div>
        </div>
    )
}
