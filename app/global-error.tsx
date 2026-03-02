"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <html lang="it">
            <body>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    gap: "1.5rem",
                    padding: "1rem",
                    fontFamily: "system-ui, sans-serif",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                            Errore critico
                        </h2>
                        <p style={{ color: "#666", maxWidth: "400px" }}>
                            Si è verificato un errore imprevisto. Riprova.
                        </p>
                    </div>
                    <button
                        onClick={reset}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "#059669",
                            color: "white",
                            border: "none",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                        }}
                    >
                        Riprova
                    </button>
                </div>
            </body>
        </html>
    )
}
