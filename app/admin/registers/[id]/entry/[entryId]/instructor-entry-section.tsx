"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveInstructorEntries } from "@/app/actions/registers"

const roleLabels: Record<string, string> = {
    DOCENTE: "Docente",
    TUTOR: "Tutor",
    CODOCENTE: "Co-docente",
    ESPERTO: "Esperto",
}

interface InstructorEntrySectionProps {
    entryId: string
    registerId: string
    effectiveHours: number
    instructors: Array<{
        id: string
        name: string
        role: string
        specialization: string | null
    }>
    existingEntries: Array<{
        instructorId: string
        hoursDelivered: number
        topics: string | null
    }>
    isEditable: boolean
}

interface InstructorRow {
    instructorId: string
    hoursDelivered: string
    topics: string
    enabled: boolean
}

export function InstructorEntrySection({
    entryId,
    registerId,
    effectiveHours,
    instructors,
    existingEntries,
    isEditable,
}: InstructorEntrySectionProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    const existingMap = new Map(
        existingEntries.map((e) => [e.instructorId, e])
    )

    const [rows, setRows] = useState<InstructorRow[]>(
        instructors.map((inst) => {
            const existing = existingMap.get(inst.id)
            return {
                instructorId: inst.id,
                hoursDelivered: existing?.hoursDelivered.toString() ?? "",
                topics: existing?.topics ?? "",
                enabled: !!existing,
            }
        })
    )

    const updateRow = (index: number, field: keyof InstructorRow, value: string | boolean) => {
        setRows((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    const handleSave = async () => {
        const entries = rows
            .filter((r) => r.enabled && r.hoursDelivered)
            .map((r) => ({
                instructorId: r.instructorId,
                hoursDelivered: Number(r.hoursDelivered),
                topics: r.topics || undefined,
            }))

        if (entries.length === 0) return

        setSaving(true)
        const result = await saveInstructorEntries(entryId, entries)
        if (!result.success) {
            alert(result.error)
        }
        setSaving(false)
        router.refresh()
    }

    if (instructors.length === 0) return null

    return (
        <Card className="bg-card border-border mb-8">
            <CardHeader>
                <CardTitle className="text-lg">Docenti della Giornata</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {instructors.map((inst, index) => {
                        const row = rows[index]
                        return (
                            <div
                                key={inst.id}
                                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                                    row.enabled ? "border-primary/30 bg-primary/5" : "border-border"
                                }`}
                            >
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={row.enabled}
                                        onChange={(e) => updateRow(index, "enabled", e.target.checked)}
                                        disabled={!isEditable}
                                        className="rounded"
                                    />
                                </label>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground text-sm">{inst.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {roleLabels[inst.role]}
                                        {inst.specialization && ` - ${inst.specialization}`}
                                    </p>
                                </div>
                                {row.enabled && (
                                    <>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max={effectiveHours}
                                                value={row.hoursDelivered}
                                                onChange={(e) => updateRow(index, "hoursDelivered", e.target.value)}
                                                disabled={!isEditable}
                                                placeholder={`${effectiveHours}h`}
                                                className="w-20 p-1 text-center rounded border border-border bg-background text-foreground text-xs"
                                            />
                                        </div>
                                        <div className="flex-1 max-w-xs">
                                            <input
                                                type="text"
                                                value={row.topics}
                                                onChange={(e) => updateRow(index, "topics", e.target.value)}
                                                disabled={!isEditable}
                                                placeholder="Argomenti specifici..."
                                                className="w-full p-1 rounded border border-border bg-background text-foreground text-xs"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>

                {isEditable && (
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleSave} disabled={saving} size="sm">
                            {saving ? "Salvataggio..." : "Salva Docenti Giornata"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
