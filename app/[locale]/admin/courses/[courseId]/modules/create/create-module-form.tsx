"use client"

import { useActionState, useState } from "react"
import { createModule } from "@/app/actions/modules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { FileText, Video, Upload, Calendar } from "lucide-react"

import { RichTextEditor } from "@/components/rich-text-editor"

const initialState = {
    message: "",
}

export function CreateModuleForm({ courseId }: { courseId: string }) {
    const createModuleWithCourseId = createModule.bind(null, courseId)
    const [state, formAction] = useActionState(createModuleWithCourseId, initialState)
    const [description, setDescription] = useState("")
    const [contentType, setContentType] = useState("VIDEO")
    const [isUploading, setIsUploading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState("")

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                setPdfUrl(data.url)
            } else {
                alert("Errore upload: " + data.message)
            }
        } catch (err) {
            alert("Errore durante l'upload")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Aggiungi Modulo</h1>

            <form action={formAction} className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titolo del Modulo</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Es. Introduzione alla Sicurezza"
                            required
                            className="mt-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrizione</Label>
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Descrizione del modulo..."
                        />
                        <input type="hidden" name="description" value={description} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="minimumDuration">Durata Minima (minuti)</Label>
                        <Input
                            id="minimumDuration"
                            name="minimumDuration"
                            type="number"
                            min="0"
                            placeholder="0 per nessuna durata minima"
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground">Tempo minimo che l'utente deve passare su questo modulo per completarlo.</p>
                    </div>

                    <div className="space-y-4">
                        <Label>Tipo di Contenuto</Label>
                        <div className="flex gap-4">
                            <div
                                className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${contentType === 'VIDEO' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                onClick={() => setContentType('VIDEO')}
                            >
                                <Video className="w-5 h-5" />
                                <span className="font-semibold">Video</span>
                            </div>
                            <div
                                className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${contentType === 'PDF' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                onClick={() => setContentType('PDF')}
                            >
                                <FileText className="w-5 h-5" />
                                <span className="font-semibold">PDF / Slide</span>
                            </div>
                            <div
                                className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${contentType === 'LIVE' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                onClick={() => setContentType('LIVE')}
                            >
                                <Calendar className="w-5 h-5" />
                                <span className="font-semibold">Live Session</span>
                            </div>
                        </div>
                        <input type="hidden" name="contentType" value={contentType} />
                    </div>

                    {contentType === 'VIDEO' && (
                        <div className="space-y-2">
                            <Label htmlFor="videoUrl">URL Video (YouTube o Vimeo)</Label>
                            <Input
                                id="videoUrl"
                                name="videoUrl"
                                type="url"
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                                className="mt-2"
                            />
                        </div>
                    )}

                    {contentType === 'PDF' && (
                        <div className="space-y-4">
                            <Label>Carica PDF</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                                {isUploading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pdfUrl">URL PDF</Label>
                                <Input
                                    id="pdfUrl"
                                    name="pdfUrl"
                                    value={pdfUrl}
                                    onChange={(e) => setPdfUrl(e.target.value)}
                                    placeholder="https://..."
                                    required
                                    readOnly={false}
                                    className="mt-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Carica un file o inserisci un URL esterno
                                </p>
                            </div>
                        </div>
                    )}

                    {contentType === 'LIVE' && (
                        <div className="space-y-4 border border-purple-500/30 p-4 rounded-lg bg-purple-500/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTime">Inizio Sessione</Label>
                                    <Input
                                        id="startTime"
                                        name="startTime"
                                        type="datetime-local"
                                        required
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endTime">Fine Sessione</Label>
                                    <Input
                                        id="endTime"
                                        name="endTime"
                                        type="datetime-local"
                                        required
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meetingUrl">Link Meeting (Zoom, Meet, Teams)</Label>
                                <Input
                                    id="meetingUrl"
                                    name="meetingUrl"
                                    type="url"
                                    placeholder="https://..."
                                    required
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {state?.message && (
                    <p className="text-red-500 text-sm">{state.message}</p>
                )}

                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isUploading ? 'Caricamento...' : 'Aggiungi Modulo'}
                    </Button>
                    <Link href={`/admin/courses/${courseId}`}>
                        <Button variant="outline" type="button">Annulla</Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
