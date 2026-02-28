"use client"

import { useActionState, useState } from "react"
import { createModule } from "@/app/actions/modules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { FileText, Video, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import dynamic from "next/dynamic"
import { apiUrl } from "@/lib/api"
import { formatDate } from "@/lib/utils"

const RichTextEditor = dynamic(
    () => import("@/components/rich-text-editor").then(mod => ({ default: mod.RichTextEditor })),
    { ssr: false }
)

function toLocalDatetimeString(date: Date | string): string {
    const d = new Date(date)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type AvailableSession = {
    id: string
    title: string
    startTime: string | null
    endTime: string | null
    meetingUrl: string | null
}

const initialState = {
    message: "",
}

export function CreateModuleForm({ courseId, availableSessions = [] }: { courseId: string, availableSessions?: AvailableSession[] }) {
    const createModuleWithCourseId = createModule.bind(null, courseId)
    const [state, formAction] = useActionState(createModuleWithCourseId, initialState)
    const [description, setDescription] = useState("")
    const [contentType, setContentType] = useState("VIDEO")
    const [isUploading, setIsUploading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState("")
    const [selectedSessionId, setSelectedSessionId] = useState("")
    const [sessionStartTime, setSessionStartTime] = useState("")
    const [sessionEndTime, setSessionEndTime] = useState("")
    const [sessionMeetingUrl, setSessionMeetingUrl] = useState("")

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(apiUrl('/api/upload'), {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                setPdfUrl(data.url)
            } else {
                alert("Errore upload: " + data.message)
            }
        } catch (_err) {
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
                        <p className="text-xs text-muted-foreground">Tempo minimo che l&apos;utente deve passare su questo modulo per completarlo.</p>
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
                        <div className="space-y-4 border border-primary/30 p-4 rounded-lg bg-primary/5">
                            <input type="hidden" name="selectedSessionId" value={selectedSessionId} />
                            {availableSessions.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Collega Aula Virtuale Esistente</Label>
                                    <Select
                                        value={selectedSessionId || "new"}
                                        onValueChange={(value) => {
                                            if (value === "new") {
                                                setSelectedSessionId("")
                                                setSessionStartTime("")
                                                setSessionEndTime("")
                                                setSessionMeetingUrl("")
                                            } else {
                                                const session = availableSessions.find(s => s.id === value)
                                                if (session) {
                                                    setSelectedSessionId(session.id)
                                                    setSessionStartTime(session.startTime ? toLocalDatetimeString(session.startTime) : "")
                                                    setSessionEndTime(session.endTime ? toLocalDatetimeString(session.endTime) : "")
                                                    setSessionMeetingUrl(session.meetingUrl || "")
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-muted border-border">
                                            <SelectValue placeholder="Seleziona un'aula virtuale..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">Crea nuova sessione</SelectItem>
                                            {[...availableSessions]
                                                .filter(s => !s.startTime || new Date(s.startTime) >= new Date(new Date().toDateString()))
                                                .sort((a, b) => {
                                                    if (!a.startTime) return 1
                                                    if (!b.startTime) return -1
                                                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                                })
                                                .map((s, i) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {i + 2}. {s.title}{s.startTime ? ` - ${formatDate(new Date(s.startTime))}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Seleziona un&apos;aula virtuale esistente o creane una nuova.</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTime">Inizio Sessione</Label>
                                    <Input
                                        id="startTime"
                                        name="startTime"
                                        type="datetime-local"
                                        value={sessionStartTime}
                                        onChange={(e) => setSessionStartTime(e.target.value)}
                                        disabled={!!selectedSessionId}
                                        className="bg-muted border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endTime">Fine Sessione</Label>
                                    <Input
                                        id="endTime"
                                        name="endTime"
                                        type="datetime-local"
                                        value={sessionEndTime}
                                        onChange={(e) => setSessionEndTime(e.target.value)}
                                        disabled={!!selectedSessionId}
                                        className="bg-muted border-border"
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
                                    value={sessionMeetingUrl}
                                    onChange={(e) => setSessionMeetingUrl(e.target.value)}
                                    className="bg-muted border-border"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-4">
                        <Label htmlFor="publishedUntil">Pubblicato Fino Al (opzionale)</Label>
                        <Input
                            id="publishedUntil"
                            name="publishedUntil"
                            type="datetime-local"
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Se impostato, il modulo non sarà più visibile agli studenti dopo questa data.
                        </p>
                    </div>
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
