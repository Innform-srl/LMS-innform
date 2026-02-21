"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRegister } from "@/app/actions/registers"

interface Course {
    id: string
    title: string
}

export function CreateRegisterForm({ courses }: { courses: Course[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        courseId: "",
        title: "",
        registerType: "INTERNAL" as "FUNDED" | "INTERNAL",
        plannedHours: "",
        complianceThreshold: "70",
        fundingBody: "",
        projectCode: "",
        editionCode: "",
        trainingLocation: "",
        notes: "",
    })

    const handleCourseChange = (courseId: string) => {
        const course = courses.find((c) => c.id === courseId)
        setFormData((prev) => ({
            ...prev,
            courseId,
            title: course ? `Registro - ${course.title}` : prev.title,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!formData.courseId) {
            setError("Seleziona un corso")
            return
        }
        if (!formData.title.trim()) {
            setError("Inserisci un titolo")
            return
        }
        if (!formData.plannedHours || Number(formData.plannedHours) <= 0) {
            setError("Inserisci le ore previste")
            return
        }

        setLoading(true)
        const result = await createRegister({
            courseId: formData.courseId,
            title: formData.title,
            registerType: formData.registerType,
            plannedHours: Number(formData.plannedHours),
            complianceThreshold: Number(formData.complianceThreshold),
            fundingBody: formData.fundingBody || undefined,
            projectCode: formData.projectCode || undefined,
            editionCode: formData.editionCode || undefined,
            trainingLocation: formData.trainingLocation || undefined,
            notes: formData.notes || undefined,
        })

        if (result.success) {
            router.push(`/admin/registers/${result.registerId}`)
        } else {
            setError(result.error || "Errore durante la creazione")
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Tipo e Corso */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Tipo e Corso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Tipo di Registro</Label>
                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, registerType: "INTERNAL" }))}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                                    formData.registerType === "INTERNAL"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50"
                                }`}
                            >
                                Interno
                                <p className="text-xs font-normal mt-1 opacity-70">Gestione aziendale semplificata</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, registerType: "FUNDED" }))}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                                    formData.registerType === "FUNDED"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50"
                                }`}
                            >
                                Finanziato
                                <p className="text-xs font-normal mt-1 opacity-70">Fondimpresa, FSE, Regione</p>
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="courseId">Corso</Label>
                        <select
                            id="courseId"
                            value={formData.courseId}
                            onChange={(e) => handleCourseChange(e.target.value)}
                            className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground"
                        >
                            <option value="">Seleziona un corso...</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="title">Titolo Registro</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                            placeholder="es: Registro - Sicurezza Lavoratori"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="plannedHours">Ore Previste</Label>
                            <Input
                                id="plannedHours"
                                type="number"
                                step="0.5"
                                min="0"
                                value={formData.plannedHours}
                                onChange={(e) => setFormData((p) => ({ ...p, plannedHours: e.target.value }))}
                                placeholder="es: 40"
                            />
                        </div>
                        <div>
                            <Label htmlFor="complianceThreshold">Soglia Compliance (%)</Label>
                            <Input
                                id="complianceThreshold"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.complianceThreshold}
                                onChange={(e) => setFormData((p) => ({ ...p, complianceThreshold: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="trainingLocation">Sede Formativa</Label>
                        <Input
                            id="trainingLocation"
                            value={formData.trainingLocation}
                            onChange={(e) => setFormData((p) => ({ ...p, trainingLocation: e.target.value }))}
                            placeholder="es: Via Roma 1, Milano"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Campi Finanziamento (solo se FUNDED) */}
            {formData.registerType === "FUNDED" && (
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-lg">Dati Finanziamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="fundingBody">Ente Finanziatore</Label>
                            <Input
                                id="fundingBody"
                                value={formData.fundingBody}
                                onChange={(e) => setFormData((p) => ({ ...p, fundingBody: e.target.value }))}
                                placeholder="es: Fondimpresa, FSE, Regione Lombardia"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="projectCode">Codice Progetto</Label>
                                <Input
                                    id="projectCode"
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData((p) => ({ ...p, projectCode: e.target.value }))}
                                    placeholder="es: AVS/123/24"
                                />
                            </div>
                            <div>
                                <Label htmlFor="editionCode">Codice Edizione</Label>
                                <Input
                                    id="editionCode"
                                    value={formData.editionCode}
                                    onChange={(e) => setFormData((p) => ({ ...p, editionCode: e.target.value }))}
                                    placeholder="es: ED01"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Note */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Note</CardTitle>
                </CardHeader>
                <CardContent>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Note aggiuntive per il registro..."
                        className="w-full p-3 rounded-md border border-border bg-background text-foreground min-h-[80px] resize-y"
                    />
                </CardContent>
            </Card>

            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Annulla
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Creazione in corso..." : "Crea Registro"}
                </Button>
            </div>
        </form>
    )
}
