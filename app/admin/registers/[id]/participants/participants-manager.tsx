"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    addParticipants,
    importParticipantsFromCourse,
    removeParticipant,
    updateParticipant,
} from "@/app/actions/registers"

interface ParticipantsManagerProps {
    register: {
        id: string
        plannedHours: number
        complianceThreshold: number
        registerType: string
        participants: Array<{
            id: string
            userId: string
            fiscalCode: string | null
            companyName: string | null
            jobTitle: string | null
            totalHours: number
            elearningHours: number
            isCompliant: boolean
            notes: string | null
            user: { id: string; name: string | null; email: string }
        }>
    }
    availableUsers: Array<{
        id: string
        name: string | null
        email: string
        company: { name: string } | null
    }>
    isEditable: boolean
}

export function ParticipantsManager({ register, availableUsers, isEditable }: ParticipantsManagerProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])

    const [editData, setEditData] = useState({
        fiscalCode: "",
        companyName: "",
        jobTitle: "",
        notes: "",
    })

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

    const handleAddSelected = async () => {
        if (selectedUsers.length === 0) return
        setLoading(true)
        const result = await addParticipants(
            register.id,
            selectedUsers.map((userId) => {
                const user = availableUsers.find((u) => u.id === userId)
                return {
                    userId,
                    companyName: user?.company?.name,
                }
            })
        )
        if (result.success) {
            setSelectedUsers([])
            setShowAddForm(false)
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

    const handleStartEdit = (participant: ParticipantsManagerProps["register"]["participants"][0]) => {
        setEditingId(participant.id)
        setEditData({
            fiscalCode: participant.fiscalCode || "",
            companyName: participant.companyName || "",
            jobTitle: participant.jobTitle || "",
            notes: participant.notes || "",
        })
    }

    const handleSaveEdit = async () => {
        if (!editingId) return
        setLoading(true)
        const result = await updateParticipant(editingId, {
            fiscalCode: editData.fiscalCode || undefined,
            companyName: editData.companyName || undefined,
            jobTitle: editData.jobTitle || undefined,
            notes: editData.notes || undefined,
        })
        if (result.success) {
            setEditingId(null)
            router.refresh()
        } else {
            alert(result.error)
        }
        setLoading(false)
    }

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        )
    }

    // Stats
    const compliantCount = register.participants.filter((p) => p.isCompliant).length
    const avgHours = register.participants.length > 0
        ? Math.round(
            register.participants.reduce((sum, p) => sum + p.totalHours + p.elearningHours, 0) /
            register.participants.length * 10
        ) / 10
        : 0
    const belowThresholdCount = register.participants.filter((p) => {
        const total = p.totalHours + p.elearningHours
        const pct = register.plannedHours > 0 ? (total / register.plannedHours) * 100 : 0
        return pct < register.complianceThreshold && pct > register.complianceThreshold * 0.7
    }).length

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{register.participants.length}</p>
                        <p className="text-xs text-muted-foreground">Totale Partecipanti</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{compliantCount}</p>
                        <p className="text-xs text-muted-foreground">Conformi</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{belowThresholdCount}</p>
                        <p className="text-xs text-muted-foreground">A Rischio</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{avgHours}h</p>
                        <p className="text-xs text-muted-foreground">Media Ore</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            {isEditable && (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleImport} disabled={loading}>
                        Importa dal Corso
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? "Chiudi" : "Aggiungi Manualmente"}
                    </Button>
                </div>
            )}

            {/* Add Users Form */}
            {showAddForm && availableUsers.length > 0 && (
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-lg">Aggiungi Partecipanti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
                            {availableUsers.map((user) => (
                                <label
                                    key={user.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                        selectedUsers.includes(user.id) ? "bg-primary/10" : "hover:bg-accent/50"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => toggleUserSelection(user.id)}
                                        className="rounded"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{user.name || user.email}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {user.email}
                                            {user.company && ` - ${user.company.name}`}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <Button
                            onClick={handleAddSelected}
                            disabled={selectedUsers.length === 0 || loading}
                            size="sm"
                        >
                            Aggiungi {selectedUsers.length} selezionati
                        </Button>
                    </CardContent>
                </Card>
            )}

            {showAddForm && availableUsers.length === 0 && (
                <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                        Tutti gli utenti approvati sono gia' nel registro.
                    </CardContent>
                </Card>
            )}

            {/* Participants Table */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Dettaglio Partecipanti</CardTitle>
                </CardHeader>
                <CardContent>
                    {register.participants.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                            Nessun partecipante.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground">
                                        <th className="text-left py-2 px-2 font-medium">#</th>
                                        <th className="text-left py-2 px-2 font-medium">Nome</th>
                                        {register.registerType === "FUNDED" && (
                                            <th className="text-left py-2 px-2 font-medium">CF</th>
                                        )}
                                        <th className="text-left py-2 px-2 font-medium">Azienda</th>
                                        <th className="text-left py-2 px-2 font-medium">Qualifica</th>
                                        <th className="text-right py-2 px-2 font-medium">Ore Aula</th>
                                        <th className="text-right py-2 px-2 font-medium">Ore E-L</th>
                                        <th className="text-right py-2 px-2 font-medium">Totale</th>
                                        <th className="text-center py-2 px-2 font-medium">Progresso</th>
                                        <th className="text-center py-2 px-2 font-medium">Stato</th>
                                        {isEditable && <th className="py-2 px-2"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {register.participants.map((p, index) => {
                                        const total = p.totalHours + p.elearningHours
                                        const pct = register.plannedHours > 0
                                            ? Math.round((total / register.plannedHours) * 100)
                                            : 0
                                        const isEditing = editingId === p.id

                                        if (isEditing) {
                                            return (
                                                <tr key={p.id} className="border-b border-border/50 bg-accent/20">
                                                    <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
                                                    <td className="py-2 px-2 font-medium">{p.user.name || p.user.email}</td>
                                                    {register.registerType === "FUNDED" && (
                                                        <td className="py-2 px-2">
                                                            <Input
                                                                value={editData.fiscalCode}
                                                                onChange={(e) => setEditData((d) => ({ ...d, fiscalCode: e.target.value }))}
                                                                placeholder="Codice Fiscale"
                                                                className="h-7 text-xs"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            value={editData.companyName}
                                                            onChange={(e) => setEditData((d) => ({ ...d, companyName: e.target.value }))}
                                                            placeholder="Azienda"
                                                            className="h-7 text-xs"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            value={editData.jobTitle}
                                                            onChange={(e) => setEditData((d) => ({ ...d, jobTitle: e.target.value }))}
                                                            placeholder="Qualifica"
                                                            className="h-7 text-xs"
                                                        />
                                                    </td>
                                                    <td colSpan={4} className="py-2 px-2">
                                                        <Input
                                                            value={editData.notes}
                                                            onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                                                            placeholder="Note"
                                                            className="h-7 text-xs"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex gap-1">
                                                            <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit} disabled={loading}>
                                                                Salva
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                                                                X
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }

                                        return (
                                            <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                                                <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
                                                <td className="py-2 px-2">
                                                    <p className="font-medium text-foreground">{p.user.name || p.user.email}</p>
                                                    <p className="text-xs text-muted-foreground">{p.user.email}</p>
                                                </td>
                                                {register.registerType === "FUNDED" && (
                                                    <td className="py-2 px-2 text-muted-foreground text-xs">{p.fiscalCode || "-"}</td>
                                                )}
                                                <td className="py-2 px-2 text-muted-foreground text-xs">{p.companyName || "-"}</td>
                                                <td className="py-2 px-2 text-muted-foreground text-xs">{p.jobTitle || "-"}</td>
                                                <td className="py-2 px-2 text-right">{p.totalHours}h</td>
                                                <td className="py-2 px-2 text-right">{p.elearningHours}h</td>
                                                <td className="py-2 px-2 text-right font-medium">{total}h</td>
                                                <td className="py-2 px-2">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    pct >= register.complianceThreshold
                                                                        ? "bg-green-500"
                                                                        : pct >= register.complianceThreshold * 0.7
                                                                            ? "bg-yellow-500"
                                                                            : "bg-red-500"
                                                                }`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        p.isCompliant
                                                            ? "bg-green-500/20 text-green-600"
                                                            : pct >= register.complianceThreshold * 0.7
                                                                ? "bg-yellow-500/20 text-yellow-600"
                                                                : "bg-red-500/20 text-red-600"
                                                    }`}>
                                                        {p.isCompliant ? "Conforme" : pct >= register.complianceThreshold * 0.7 ? "A rischio" : "Non conforme"}
                                                    </span>
                                                </td>
                                                {isEditable && (
                                                    <td className="py-2 px-2">
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-7"
                                                                onClick={() => handleStartEdit(p)}
                                                            >
                                                                Modifica
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-7 text-destructive hover:text-destructive"
                                                                onClick={() => handleRemove(p.id, p.user.name)}
                                                            >
                                                                Rimuovi
                                                            </Button>
                                                        </div>
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
        </div>
    )
}
