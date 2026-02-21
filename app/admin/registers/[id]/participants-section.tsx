"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { importParticipantsFromCourse, removeParticipant } from "@/app/actions/registers"

function formatHours(hours: number): string {
    if (hours === 0) return "0min"
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

interface ParticipantsSectionProps {
    register: {
        id: string
        plannedHours: number
        complianceThreshold: number
        participants: Array<{
            id: string
            userId: string
            fiscalCode: string | null
            companyName: string | null
            jobTitle: string | null
            totalHours: number
            elearningHours: number
            isCompliant: boolean
            user: { id: string; name: string | null; email: string }
        }>
    }
    isEditable: boolean
}

export function ParticipantsSection({ register, isEditable }: ParticipantsSectionProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleImport = async () => {
        setLoading(true)
        const result = await importParticipantsFromCourse(register.id)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error)
        }
        setLoading(false)
    }

    const handleRemove = async (participantId: string, name: string | null) => {
        if (!confirm(`Rimuovere ${name || "questo partecipante"} dal registro?`)) return
        await removeParticipant(participantId)
        router.refresh()
    }

    return (
        <Card className="bg-card border-border mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Monte Ore Partecipanti</CardTitle>
                {isEditable && (
                    <Button size="sm" variant="outline" onClick={handleImport} disabled={loading}>
                        {loading ? "Importazione..." : "Importa dal Corso"}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {register.participants.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        Nessun partecipante. Importa i partecipanti dal corso.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left py-2 px-2 font-medium">Partecipante</th>
                                    <th className="text-left py-2 px-2 font-medium">Azienda</th>
                                    <th className="text-right py-2 px-2 font-medium">Ore Aula</th>
                                    <th className="text-right py-2 px-2 font-medium">Ore E-Learn</th>
                                    <th className="text-right py-2 px-2 font-medium">Totale</th>
                                    <th className="text-right py-2 px-2 font-medium">%</th>
                                    <th className="text-center py-2 px-2 font-medium">Stato</th>
                                    {isEditable && <th className="py-2 px-2"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {register.participants.map((p) => {
                                    const total = p.totalHours + p.elearningHours
                                    const pct = register.plannedHours > 0
                                        ? Math.round((total / register.plannedHours) * 100)
                                        : 0
                                    return (
                                        <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                                            <td className="py-2 px-2">
                                                <p className="font-medium text-foreground">{p.user.name || p.user.email}</p>
                                                <p className="text-xs text-muted-foreground">{p.user.email}</p>
                                            </td>
                                            <td className="py-2 px-2 text-muted-foreground">{p.companyName || "-"}</td>
                                            <td className="py-2 px-2 text-right text-foreground">{formatHours(p.totalHours)}</td>
                                            <td className="py-2 px-2 text-right text-foreground">{formatHours(p.elearningHours)}</td>
                                            <td className="py-2 px-2 text-right font-medium text-foreground">{formatHours(total)}</td>
                                            <td className="py-2 px-2 text-right text-foreground">{pct}%</td>
                                            <td className="py-2 px-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    p.isCompliant
                                                        ? "bg-green-500/20 text-green-600"
                                                        : "bg-red-500/20 text-red-600"
                                                }`}>
                                                    {p.isCompliant ? "Conforme" : "Non conforme"}
                                                </span>
                                            </td>
                                            {isEditable && (
                                                <td className="py-2 px-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs text-destructive hover:text-destructive"
                                                        onClick={() => handleRemove(p.id, p.user.name)}
                                                    >
                                                        Rimuovi
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
