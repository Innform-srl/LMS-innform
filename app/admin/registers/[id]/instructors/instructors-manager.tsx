"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addInstructor, removeInstructor } from "@/app/actions/registers"

interface TeacherUser {
    id: string
    name: string | null
    email: string
}

interface InstructorsManagerProps {
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

export function InstructorsManager({ register, isEditable, teacherUsers = [] }: InstructorsManagerProps) {
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
        if (!confirm(`Rimuovere ${name}? Le ore erogate verranno eliminate.`)) return
        await removeInstructor(instructorId)
        router.refresh()
    }

    if (!isEditable && register.instructors.length === 0) return null

    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Gestione Docenti</CardTitle>
                {isEditable && !showForm && (
                    <Button size="sm" onClick={() => setShowForm(true)}>
                        + Aggiungi Docente
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {showForm && (
                    <div className="mb-6 p-4 rounded-lg border border-border space-y-4">
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
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="new-instr-name">Nome Completo</Label>
                                    <Input
                                        id="new-instr-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                        placeholder="es: Mario Rossi"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="new-instr-email">Email</Label>
                                    <Input
                                        id="new-instr-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                        placeholder="mario.rossi@email.it"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
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
                                    <Label htmlFor="new-instr-spec">Specializzazione</Label>
                                    <Input
                                        id="new-instr-spec"
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
                                    {loading ? "Salvataggio..." : "Aggiungi Docente"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {register.instructors.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        Nessun docente aggiunto al registro.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {register.instructors.map((inst) => (
                            <div
                                key={inst.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                        {inst.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{inst.name}</p>
                                        <div className="flex gap-2 items-center text-xs text-muted-foreground">
                                            <span className="px-2 py-0.5 rounded-full bg-accent">
                                                {inst.role === "DOCENTE" ? "Docente" : inst.role === "TUTOR" ? "Tutor" : inst.role === "CODOCENTE" ? "Co-docente" : "Esperto"}
                                            </span>
                                            {inst.specialization && <span>{inst.specialization}</span>}
                                            {inst.email && <span>{inst.email}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-foreground">{inst.totalHours}h</p>
                                        <p className="text-xs text-muted-foreground">ore erogate</p>
                                    </div>
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
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
