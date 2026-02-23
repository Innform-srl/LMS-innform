"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEntry, getLiveSessionsForRegister } from "@/app/actions/registers"
import { formatDateOnly } from "@/lib/utils"

type LiveSessionOption = {
    id: string
    title: string
    startTime: Date | null
    endTime: Date | null
    sessionType: string
    _count: { attendance: number }
    alreadyLinked: boolean
}

export function AddEntryForm({ registerId }: { registerId: string }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [liveSessions, setLiveSessions] = useState<LiveSessionOption[]>([])
    const [loadingSessions, setLoadingSessions] = useState(false)

    const [formData, setFormData] = useState({
        date: "",
        startTime: "09:00",
        endTime: "13:00",
        pauseMinutes: "0",
        topics: "",
        deliveryMode: "IN_PERSON" as "IN_PERSON" | "ONLINE" | "ELEARNING",
        liveSessionId: "",
        notes: "",
    })

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoadingSessions(true)
        getLiveSessionsForRegister(registerId).then((sessions) => {
            if (!cancelled) {
                setLiveSessions(sessions)
                setLoadingSessions(false)
            }
        })
        return () => { cancelled = true }
    }, [isOpen, registerId])

    const handleSelectLiveSession = (sessionId: string) => {
        if (!sessionId) {
            setFormData((p) => ({ ...p, liveSessionId: "" }))
            return
        }
        const ls = liveSessions.find((s) => s.id === sessionId)
        if (!ls) return

        const start = ls.startTime ? new Date(ls.startTime) : new Date()
        const end = ls.endTime ? new Date(ls.endTime) : new Date()
        const dateStr = start.toISOString().split("T")[0]
        const startTimeStr = `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}`
        const endTimeStr = `${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`

        const deliveryMode = ls.sessionType === "IN_PERSON" ? "IN_PERSON" as const : "ONLINE" as const

        setFormData((p) => ({
            ...p,
            liveSessionId: sessionId,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            deliveryMode,
            topics: p.topics || ls.title,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!formData.date || !formData.topics.trim()) {
            setError("Data e argomenti sono obbligatori")
            return
        }

        setLoading(true)

        const dateStr = formData.date
        const startDateTime = new Date(`${dateStr}T${formData.startTime}:00`)
        const endDateTime = new Date(`${dateStr}T${formData.endTime}:00`)

        const result = await createEntry({
            registerId,
            date: new Date(dateStr),
            startTime: startDateTime,
            endTime: endDateTime,
            pauseMinutes: Number(formData.pauseMinutes) || 0,
            topics: formData.topics,
            deliveryMode: formData.deliveryMode,
            liveSessionId: formData.liveSessionId || undefined,
            notes: formData.notes || undefined,
        })

        if (result.success) {
            setIsOpen(false)
            setFormData({
                date: "",
                startTime: "09:00",
                endTime: "13:00",
                pauseMinutes: "0",
                topics: "",
                deliveryMode: "IN_PERSON",
                liveSessionId: "",
                notes: "",
            })
            router.refresh()
        } else {
            setError(result.error || "Errore")
        }
        setLoading(false)
    }

    if (!isOpen) {
        return (
            <Button size="sm" onClick={() => setIsOpen(true)}>
                + Aggiungi Giornata
            </Button>
        )
    }

    const availableSessions = liveSessions.filter((s) => !s.alreadyLinked)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Nuova Giornata Formativa</h3>

                {error && (
                    <div className="p-2 mb-4 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Live Session Selector */}
                    {availableSessions.length > 0 && (
                        <div>
                            <Label htmlFor="live-session-select">Importa da Sessione Live</Label>
                            <select
                                id="live-session-select"
                                value={formData.liveSessionId}
                                onChange={(e) => handleSelectLiveSession(e.target.value)}
                                className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm"
                            >
                                <option value="">-- Compilazione manuale --</option>
                                {availableSessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.startTime ? formatDateOnly(new Date(s.startTime)) : 'N/D'} - {s.title} ({s._count.attendance} presenze)
                                    </option>
                                ))}
                            </select>
                            {formData.liveSessionId && (
                                <p className="text-xs text-green-600 mt-1">
                                    Le presenze verranno compilate automaticamente dalla sessione live
                                </p>
                            )}
                            {loadingSessions && (
                                <p className="text-xs text-muted-foreground mt-1">Caricamento sessioni...</p>
                            )}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="entry-date">Data</Label>
                        <Input
                            id="entry-date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="entry-start">Inizio</Label>
                            <Input
                                id="entry-start"
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="entry-end">Fine</Label>
                            <Input
                                id="entry-end"
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="entry-pause">Pausa (min)</Label>
                            <Input
                                id="entry-pause"
                                type="number"
                                min="0"
                                value={formData.pauseMinutes}
                                onChange={(e) => setFormData((p) => ({ ...p, pauseMinutes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Modalita&apos;</Label>
                        <div className="flex gap-2 mt-1">
                            {(["IN_PERSON", "ONLINE", "ELEARNING"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setFormData((p) => ({ ...p, deliveryMode: mode }))}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                        formData.deliveryMode === mode
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground"
                                    }`}
                                >
                                    {mode === "IN_PERSON" ? "Aula" : mode === "ONLINE" ? "Online" : "E-Learning"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="entry-topics">Argomenti Trattati</Label>
                        <textarea
                            id="entry-topics"
                            value={formData.topics}
                            onChange={(e) => setFormData((p) => ({ ...p, topics: e.target.value }))}
                            placeholder="Argomenti della giornata..."
                            className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground min-h-[80px] resize-y text-sm"
                        />
                    </div>

                    <div>
                        <Label htmlFor="entry-notes">Note</Label>
                        <Input
                            id="entry-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Note opzionali..."
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                            Annulla
                        </Button>
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Salvataggio..." : "Aggiungi"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
