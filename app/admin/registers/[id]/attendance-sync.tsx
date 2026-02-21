"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { syncAttendanceFromLiveSessions } from "@/app/actions/registers"

export function AttendanceSync({ registerId, isEditable }: { registerId: string; isEditable: boolean }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    if (!isEditable) return null

    const handleSync = async () => {
        setLoading(true)
        setResult(null)
        const res = await syncAttendanceFromLiveSessions(registerId)
        if (res.success) {
            const parts = []
            if (res.participantsImported && res.participantsImported > 0) parts.push(`${res.participantsImported} partecipanti importati`)
            parts.push(`${res.entriesCreated} giornate create`)
            parts.push(`${res.attendancesFilled} presenze compilate`)
            setResult(`${res.totalSessions} sessioni: ${parts.join(", ")}`)
            router.refresh()
        } else {
            setResult(res.error || "Errore")
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
                {loading ? "Sincronizzazione..." : "Sync Presenze Moduli"}
            </Button>
            {result && (
                <span className="text-xs text-muted-foreground">{result}</span>
            )}
        </div>
    )
}
