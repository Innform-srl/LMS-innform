"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateModule } from "@/app/actions/modules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Video, Calendar } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
    () => import("@/components/rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
    { ssr: false }
);

function toLocalDatetimeString(date: Date | string): string {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type AvailableSession = {
    id: string;
    title: string;
    startTime: string | null;
    endTime: string | null;
    meetingUrl: string | null;
};

type Module = {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string | null;
    videoDuration: number | null;
    contentType?: string | null;
    pdfUrl?: string | null;
    minimumDuration?: number | null;
    publishedUntil?: string | Date | null;
    position: number;
    liveSession?: {
        id: string;
        title: string;
        startTime: string | null;
        endTime: string | null;
        meetingUrl: string | null;
    } | null;
};

export function EditModuleForm({
    module,
    courseId,
    availableSessions = [],
}: {
    module: Module & {
        liveSessionId?: string | null;
        totalPages?: number | null;
        course: { id: string; title: string };
    };
    courseId: string;
    availableSessions?: AvailableSession[];
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [form, setForm] = useState({
        title: module.title,
        description: module.description || "",
        videoUrl: module.videoUrl || "",
        videoDuration: Math.round((module.videoDuration || 0) / 60),
        contentType: module.contentType || "VIDEO",
        pdfUrl: module.pdfUrl || "",
        totalPages: module.totalPages || 0,
        minimumDuration: module.minimumDuration || 0,
        selectedSessionId: module.liveSessionId || "",
        startTime: module.liveSession?.startTime ? toLocalDatetimeString(module.liveSession.startTime) : "",
        endTime: module.liveSession?.endTime ? toLocalDatetimeString(module.liveSession.endTime) : "",
        meetingUrl: module.liveSession?.meetingUrl || "",
        publishedUntil: module.publishedUntil ? toLocalDatetimeString(module.publishedUntil) : "",
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(apiUrl("/api/upload"), {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setForm((prev) => ({ ...prev, pdfUrl: data.url }));
            } else {
                alert("Errore upload: " + data.message);
            }
        } catch (_err) {
            alert("Errore durante l'upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = await updateModule(module.id, {
            title: form.title,
            description: form.description || null,
            videoUrl: form.videoUrl || null,
            videoDuration: form.videoDuration ? form.videoDuration * 60 : null,
            contentType: form.contentType,
            pdfUrl: form.pdfUrl || null,
            totalPages: form.totalPages || null,
            minimumDuration: form.minimumDuration,
            selectedSessionId: form.selectedSessionId || undefined,
            startTime: form.startTime,
            endTime: form.endTime,
            meetingUrl: form.meetingUrl,
            publishedUntil: form.publishedUntil || null,
        });

        if (result.success) {
            router.push(`/admin/courses/${courseId}`);
            router.refresh();
        } else {
            alert(result.error || "Errore durante l'aggiornamento");
        }

        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div>
                    <Label htmlFor="title">Titolo Modulo *</Label>
                    <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Es: Introduzione al Corso"
                        required
                        className="mt-2"
                    />
                </div>

                <div>
                    <Label htmlFor="description">Descrizione</Label>
                    <RichTextEditor
                        value={form.description}
                        onChange={(val) => setForm({ ...form, description: val })}
                        placeholder="Descrizione breve del modulo..."
                    />
                </div>

                <div>
                    <Label htmlFor="minimumDuration">Durata Minima (minuti)</Label>
                    <Input
                        id="minimumDuration"
                        type="number"
                        value={form.minimumDuration}
                        onChange={(e) => setForm({ ...form, minimumDuration: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="0 per nessuna durata minima"
                        className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground">
                        Tempo minimo che l&apos;utente deve passare su questo modulo per completarlo.
                    </p>
                </div>

                <div className="space-y-4">
                    <Label>Tipo di Contenuto</Label>
                    <div className="flex gap-4">
                        <div
                            className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.contentType === "VIDEO" ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                            onClick={() => setForm({ ...form, contentType: "VIDEO" })}
                        >
                            <Video className="w-5 h-5" />
                            <span className="font-semibold">Video</span>
                        </div>
                        <div
                            className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.contentType === "PDF" ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                            onClick={() => setForm({ ...form, contentType: "PDF" })}
                        >
                            <FileText className="w-5 h-5" />
                            <span className="font-semibold">PDF / Slide</span>
                        </div>
                        <div
                            className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.contentType === "LIVE" ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                            onClick={() => setForm({ ...form, contentType: "LIVE" })}
                        >
                            <Calendar className="w-5 h-5" />
                            <span className="font-semibold">Live Session</span>
                        </div>
                    </div>
                </div>

                {form.contentType === "VIDEO" && (
                    <>
                        <div>
                            <Label htmlFor="videoUrl">URL Video</Label>
                            <Input
                                id="videoUrl"
                                type="url"
                                value={form.videoUrl}
                                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="videoDuration">Durata Video (minuti)</Label>
                            <Input
                                id="videoDuration"
                                type="number"
                                value={form.videoDuration}
                                onChange={(e) => setForm({ ...form, videoDuration: parseInt(e.target.value) || 0 })}
                                placeholder="Es: 5"
                                className="mt-2"
                            />
                        </div>
                    </>
                )}

                {form.contentType === "PDF" && (
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
                            {isUploading && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="pdfUrl">URL PDF</Label>
                            <Input
                                id="pdfUrl"
                                value={form.pdfUrl}
                                onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                                placeholder="https://..."
                                className="mt-2"
                            />
                        </div>
                    </div>
                )}

                {form.contentType === "LIVE" && (
                    <div className="space-y-4 border border-primary/30 p-4 rounded-lg bg-primary/5">
                        {availableSessions.length > 0 && (
                            <div className="space-y-2">
                                <Label>Collega Aula Virtuale Esistente</Label>
                                <Select
                                    value={form.selectedSessionId || "new"}
                                    onValueChange={(value) => {
                                        if (value === "new") {
                                            setForm({
                                                ...form,
                                                selectedSessionId: "",
                                                startTime: "",
                                                endTime: "",
                                                meetingUrl: "",
                                            });
                                        } else {
                                            const session = availableSessions.find((s) => s.id === value);
                                            if (session) {
                                                setForm({
                                                    ...form,
                                                    selectedSessionId: session.id,
                                                    startTime: session.startTime
                                                        ? toLocalDatetimeString(session.startTime)
                                                        : "",
                                                    endTime: session.endTime
                                                        ? toLocalDatetimeString(session.endTime)
                                                        : "",
                                                    meetingUrl: session.meetingUrl || "",
                                                });
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
                                            .filter(
                                                (s) =>
                                                    !s.startTime ||
                                                    new Date(s.startTime) >= new Date(new Date().toDateString())
                                            )
                                            .sort((a, b) => {
                                                if (!a.startTime) return 1;
                                                if (!b.startTime) return -1;
                                                return (
                                                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                                );
                                            })
                                            .map((s, i) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {i + 2}. {s.title}
                                                    {s.startTime ? ` - ${formatDate(new Date(s.startTime))}` : ""}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Seleziona un&apos;aula virtuale esistente o creane una nuova.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Inizio Sessione</Label>
                                <Input
                                    id="startTime"
                                    type="datetime-local"
                                    value={form.startTime}
                                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                    disabled={!!form.selectedSessionId}
                                    className="bg-muted border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">Fine Sessione</Label>
                                <Input
                                    id="endTime"
                                    type="datetime-local"
                                    value={form.endTime}
                                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                    disabled={!!form.selectedSessionId}
                                    className="bg-muted border-border"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="meetingUrl">Link Meeting (Zoom, Meet, Teams)</Label>
                            <Input
                                id="meetingUrl"
                                type="url"
                                value={form.meetingUrl}
                                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                                placeholder="https://..."
                                className="bg-muted border-border"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2 border-t border-border pt-4">
                    <Label htmlFor="publishedUntil">Pubblicato Fino Al (opzionale)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="publishedUntil"
                            type="datetime-local"
                            value={form.publishedUntil}
                            onChange={(e) => setForm({ ...form, publishedUntil: e.target.value })}
                            className="mt-2 flex-1"
                        />
                        {form.publishedUntil && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive mt-2"
                                onClick={() => setForm({ ...form, publishedUntil: "" })}
                            >
                                Rimuovi
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Se impostato, il modulo non sarà più visibile agli studenti dopo questa data.
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isSubmitting ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/admin/courses/${courseId}`)}
                    disabled={isSubmitting}
                >
                    Annulla
                </Button>
            </div>
        </form>
    );
}
