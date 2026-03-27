"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Plus, Calendar, Users, BookOpen } from "lucide-react"
import Link from "next/link"
import { createEdition } from "@/app/actions/editions"

interface Edition {
    id: string
    code: string
    title: string
    description: string | null
    status: string
    published: boolean
    startDate: string | null
    endDate: string | null
    maxParticipants: number
    _count: { enrollments: number }
}

interface EditionsSectionProps {
    courseId: string
    courseTitle: string
    editions: Edition[]
}

const statusLabels: Record<string, string> = {
    planned: "Pianificata",
    open: "Aperta",
    in_progress: "In Corso",
    completed: "Completata",
    cancelled: "Annullata",
}

const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

export function EditionsSection({ courseId, courseTitle, editions: initialEditions }: EditionsSectionProps) {
    const [editions, setEditions] = useState<Edition[]>(initialEditions)
    const [showForm, setShowForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [form, setForm] = useState({
        code: "",
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        maxParticipants: "30",
        status: "planned",
    })

    const handleCreate = async () => {
        if (!form.code.trim() || !form.title.trim()) {
            toast.error("Codice e titolo sono obbligatori")
            return
        }

        setIsCreating(true)
        try {
            const result = await createEdition({
                courseId,
                code: form.code.trim(),
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
                maxParticipants: parseInt(form.maxParticipants) || 30,
                status: form.status,
            })

            if (result.success && result.edition) {
                toast.success("Edizione creata")
                setEditions([result.edition, ...editions])
                setShowForm(false)
                setForm({
                    code: "",
                    title: "",
                    description: "",
                    startDate: "",
                    endDate: "",
                    maxParticipants: "30",
                    status: "planned",
                })
            } else {
                toast.error(result.error || "Errore nella creazione")
            }
        } catch {
            toast.error("Errore nella creazione dell'edizione")
        }
        setIsCreating(false)
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Edizioni ({editions.length})
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={() => setShowForm(!showForm)}
                        variant={showForm ? "outline" : "default"}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {showForm ? "Annulla" : "Nuova Edizione"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Form creazione */}
                {showForm && (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ed-code">Codice *</Label>
                                <Input
                                    id="ed-code"
                                    placeholder="es. FD_1_ED12"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ed-title">Titolo *</Label>
                                <Input
                                    id="ed-title"
                                    placeholder={`${courseTitle} — Ed. 1`}
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ed-desc">Descrizione</Label>
                            <Input
                                id="ed-desc"
                                placeholder="Descrizione opzionale"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ed-start">Data Inizio</Label>
                                <Input
                                    id="ed-start"
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ed-end">Data Fine</Label>
                                <Input
                                    id="ed-end"
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ed-max">Max Partecipanti</Label>
                                <Input
                                    id="ed-max"
                                    type="number"
                                    value={form.maxParticipants}
                                    onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ed-status">Stato</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planned">Pianificata</SelectItem>
                                        <SelectItem value="open">Aperta</SelectItem>
                                        <SelectItem value="in_progress">In Corso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Crea Edizione
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lista edizioni */}
                {editions.length === 0 && !showForm ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>Nessuna edizione. Le edizioni vengono create da SafeInnform o manualmente.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {editions.map((edition) => (
                            <Link
                                key={edition.id}
                                href={`/admin/courses/${courseId}/editions/${edition.id}`}
                                className="block"
                            >
                                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {edition.title}
                                                <span className="ml-2 text-xs text-muted-foreground font-mono">
                                                    {edition.code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(edition.startDate)} — {formatDate(edition.endDate)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {edition._count.enrollments} / {edition.maxParticipants}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={statusColors[edition.status] || statusColors.planned}>
                                        {statusLabels[edition.status] || edition.status}
                                    </Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
