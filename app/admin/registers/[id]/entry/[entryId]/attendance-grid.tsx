"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveEntryAttendance, autoFillFromLiveSession } from "@/app/actions/registers"

type AttendanceStatus = "REGISTERED" | "PRESENT" | "ATTENDED" | "ABSENT" | "LATE" | "EXCUSED"

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: "PRESENT", label: "Presente", color: "bg-green-500/20 text-green-600 border-green-500/30" },
    { value: "ABSENT", label: "Assente", color: "bg-red-500/20 text-red-600 border-red-500/30" },
    { value: "LATE", label: "Ritardo", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
    { value: "EXCUSED", label: "Giustificato", color: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
]

interface AttendanceGridProps {
    entryId: string
    registerId: string
    effectiveHours: number
    participants: Array<{
        id: string
        userId: string
        user: { id: string; name: string | null; email: string }
    }>
    existingAttendances: Array<{
        participantId: string
        status: AttendanceStatus
        hoursAttended: number | null
        notes: string | null
    }>
    hasLiveSession: boolean
    isEditable: boolean
}

interface AttendanceRow {
    participantId: string
    status: AttendanceStatus
    hoursAttended: string
    notes: string
}

export function AttendanceGrid({
    entryId,
    registerId,
    effectiveHours,
    participants,
    existingAttendances,
    hasLiveSession,
    isEditable,
}: AttendanceGridProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [autoFilling, setAutoFilling] = useState(false)

    const existingMap = new Map(
        existingAttendances.map((a) => [a.participantId, a])
    )

    const [rows, setRows] = useState<AttendanceRow[]>(
        participants.map((p) => {
            const existing = existingMap.get(p.id)
            return {
                participantId: p.id,
                status: existing?.status ?? "PRESENT",
                hoursAttended: existing?.hoursAttended?.toString() ?? "",
                notes: existing?.notes ?? "",
            }
        })
    )

    const updateRow = (index: number, field: keyof AttendanceRow, value: string) => {
        setRows((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    const markAll = (status: AttendanceStatus) => {
        setRows((prev) => prev.map((r) => ({ ...r, status })))
    }

    const handleSave = async () => {
        setSaving(true)
        const result = await saveEntryAttendance(
            entryId,
            rows.map((r) => ({
                participantId: r.participantId,
                status: r.status as AttendanceStatus,
                hoursAttended: r.hoursAttended ? Number(r.hoursAttended) : undefined,
                notes: r.notes || undefined,
            }))
        )
        if (!result.success) {
            alert(result.error)
        }
        setSaving(false)
        router.refresh()
    }

    const handleAutoFill = async () => {
        setAutoFilling(true)
        const result = await autoFillFromLiveSession(entryId)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error)
        }
        setAutoFilling(false)
    }

    return (
        <Card className="bg-card border-border mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Appello - Presenze</CardTitle>
                <div className="flex gap-2">
                    {isEditable && hasLiveSession && (
                        <Button size="sm" variant="outline" onClick={handleAutoFill} disabled={autoFilling}>
                            {autoFilling ? "..." : "Auto-fill da Sessione Live"}
                        </Button>
                    )}
                    {isEditable && (
                        <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => markAll("PRESENT")} className="text-xs">
                                Tutti Presenti
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => markAll("ABSENT")} className="text-xs">
                                Tutti Assenti
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {participants.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        Nessun partecipante nel registro.
                    </p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground">
                                        <th className="text-left py-2 px-2 font-medium w-8">#</th>
                                        <th className="text-left py-2 px-2 font-medium">Partecipante</th>
                                        <th className="text-center py-2 px-2 font-medium">Stato</th>
                                        <th className="text-center py-2 px-2 font-medium w-24">Ore</th>
                                        <th className="text-left py-2 px-2 font-medium">Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, index) => {
                                        const row = rows[index]
                                        return (
                                            <tr key={p.id} className="border-b border-border/50">
                                                <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
                                                <td className="py-2 px-2">
                                                    <p className="font-medium text-foreground">{p.user.name || p.user.email}</p>
                                                    <p className="text-xs text-muted-foreground">{p.user.email}</p>
                                                </td>
                                                <td className="py-2 px-2">
                                                    <div className="flex gap-1 justify-center flex-wrap">
                                                        {statusOptions.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                disabled={!isEditable}
                                                                onClick={() => updateRow(index, "status", opt.value)}
                                                                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                                                    row.status === opt.value
                                                                        ? opt.color
                                                                        : "border-border text-muted-foreground hover:border-border/80"
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        max={effectiveHours}
                                                        value={row.hoursAttended}
                                                        onChange={(e) => updateRow(index, "hoursAttended", e.target.value)}
                                                        disabled={!isEditable}
                                                        placeholder={`${Math.round(effectiveHours * 100) / 100}`}
                                                        className="w-20 p-1 text-center rounded border border-border bg-background text-foreground text-xs"
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="text"
                                                        value={row.notes}
                                                        onChange={(e) => updateRow(index, "notes", e.target.value)}
                                                        disabled={!isEditable}
                                                        placeholder="es: uscita anticipata"
                                                        className="w-full p-1 rounded border border-border bg-background text-foreground text-xs"
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {isEditable && (
                            <div className="flex justify-end mt-4">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? "Salvataggio..." : "Salva Presenze"}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
