"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addInstructor, removeInstructor } from "@/app/actions/registers"

function formatHours(hours: number): string {
    if (hours === 0) return "0min"
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

const roleLabels: Record<string, string> = {
    DOCENTE: "Docente",
    TUTOR: "Tutor",
    CODOCENTE: "Co-docente",
    ESPERTO: "Esperto",
}

interface TeacherUser {
    id: string
    name: string | null
    email: string
}

interface InstructorsSectionProps {
    register: {
        id: string
        instructors: Array<{
            id: string
            name: string
            email: string | null
            role: string
            specialization: string | null
            totalHours: number
        }>
    }
    isEditable: boolean
    teacherUsers?: TeacherUser[]
}

export function InstructorsSection({ register, isEditable, teacherUsers = [] }: InstructorsSectionProps) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "DOCENTE" as "DOCENTE" | "TUTOR" | "CODOCENTE" | "ESPERTO",
        specialization: "",
    })

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setLoading(true)
        const result = await addInstructor({
            registerId: register.id,
            name: formData.name,
            email: formData.email || undefined,
            role: formData.role,
            specialization: formData.specialization || undefined,
        })

        if (result.success) {
            setShowForm(false)
            setFormData({ name: "", email: "", role: "DOCENTE", specialization: "" })
            router.refresh()
        } else {
            alert(result.error)
        }
        setLoading(false)
    }

    const handleRemove = async (instructorId: string, name: string) => {
        if (!confirm(`Rimuovere ${name}?`)) return
        await removeInstructor(instructorId)
        router.refresh()
    }

    return (
        <Card className="bg-card border-border mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Docenti e Tutor</CardTitle>
                {isEditable && !showForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                        + Aggiungi Docente
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {showForm && (
                    <div className="mb-4 p-4 rounded-lg border border-border space-y-4">
                        {teacherUsers.length > 0 && (
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Seleziona dal sistema</Label>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {teacherUsers.map((teacher) => (
                                        <button
                                            key={teacher.id}
                                            type="button"
                                            className="w-full flex items-center gap-3 p-2 rounded-md border border-border hover:bg-accent/50 transition-colors text-left"
                                            disabled={loading}
                                            onClick={async () => {
                                                setLoading(true)
                                                const result = await addInstructor({
                                                    registerId: register.id,
                                                    name: teacher.name || teacher.email,
                                                    email: teacher.email,
                                                    role: "DOCENTE",
                                                    userId: teacher.id,
                                                })
                                                if (result.success) {
                                                    setShowForm(false)
                                                    router.refresh()
                                                } else {
                                                    alert(result.error)
                                                }
                                                setLoading(false)
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                                {(teacher.name || teacher.email)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{teacher.name || teacher.email}</p>
                                                <p className="text-xs text-muted-foreground">{teacher.email}</p>
                                            </div>
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Docente</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="relative my-3">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">oppure aggiungi manualmente</span></div>
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleAdd} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="instr-name">Nome</Label>
                                    <Input
                                        id="instr-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="instr-email">Email</Label>
                                    <Input
                                        id="instr-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                        placeholder="email@esempio.it"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Ruolo</Label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as typeof formData.role }))}
                                        className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm"
                                    >
                                        <option value="DOCENTE">Docente</option>
                                        <option value="TUTOR">Tutor</option>
                                        <option value="CODOCENTE">Co-docente</option>
                                        <option value="ESPERTO">Esperto</option>
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="instr-spec">Specializzazione</Label>
                                    <Input
                                        id="instr-spec"
                                        value={formData.specialization}
                                        onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                                        placeholder="es: Sicurezza sul lavoro"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                                    Annulla
                                </Button>
                                <Button type="submit" size="sm" disabled={loading}>
                                    {loading ? "..." : "Aggiungi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {register.instructors.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        Nessun docente aggiunto.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {register.instructors.map((inst) => (
                            <div
                                key={inst.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{inst.name}</p>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                        <span className="px-2 py-0.5 rounded-full bg-accent">{roleLabels[inst.role]}</span>
                                        {inst.specialization && <span>{inst.specialization}</span>}
                                        {inst.email && <span>{inst.email}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-foreground">{formatHours(inst.totalHours)}</span>
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-destructive hover:text-destructive"
                                            onClick={() => handleRemove(inst.id, inst.name)}
                                        >
                                            Rimuovi
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
