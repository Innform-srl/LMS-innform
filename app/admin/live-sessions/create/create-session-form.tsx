"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLiveSession } from "@/app/actions/live-sessions";
import { useToast } from "@/components/ui/use-toast";

interface Edition {
    id: string;
    code: string;
    title: string;
    status: string;
}

interface CreateSessionFormProps {
    courses: { id: string; title: string; editions: Edition[] }[];
    instructors: { id: string; name: string | null; email: string }[];
    currentUserId: string;
}

export function CreateSessionForm({ courses, instructors, currentUserId }: CreateSessionFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("none");
    const [selectedEditionId, setSelectedEditionId] = useState<string>("none");
    const [selectedInstructorId, setSelectedInstructorId] = useState<string>(currentUserId);

    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const availableEditions = selectedCourse?.editions || [];

    const handleCourseChange = (value: string) => {
        setSelectedCourseId(value);
        setSelectedEditionId("none");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const startTime = formData.get("startTime") as string;
        const endTime = formData.get("endTime") as string;
        const meetingUrl = formData.get("meetingUrl") as string;

        try {
            await createLiveSession({
                title,
                description,
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
                meetingUrl: meetingUrl || undefined,
                courseId: selectedCourseId === "none" ? undefined : selectedCourseId,
                editionId: selectedEditionId === "none" ? undefined : selectedEditionId,
                instructorId: selectedInstructorId,
            });

            toast({
                title: "Successo",
                description: "Sessione creata correttamente",
            });

            router.push("/admin/live-sessions");
        } catch (_error) {
            toast({
                title: "Errore",
                description: "Impossibile creare la sessione",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">Titolo Sessione</Label>
                <Input id="title" name="title" required placeholder="es. Webinar Q&A" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea id="description" name="description" placeholder="Dettagli della sessione..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startTime">Inizio</Label>
                    <Input id="startTime" name="startTime" type="datetime-local" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endTime">Fine</Label>
                    <Input id="endTime" name="endTime" type="datetime-local" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="meetingUrl">Link Meeting (Zoom, Meet, Teams)</Label>
                <Input id="meetingUrl" name="meetingUrl" type="url" placeholder="https://..." />
            </div>

            <div className="space-y-2">
                <Label>Docente</Label>
                <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona docente..." />
                    </SelectTrigger>
                    <SelectContent>
                        {instructors.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                                {inst.name || inst.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Collega a un Corso (Opzionale)</Label>
                <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona un corso..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nessun corso</SelectItem>
                        {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {availableEditions.length > 0 && (
                <div className="space-y-2">
                    <Label>Edizione (Opzionale)</Label>
                    <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleziona edizione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nessuna edizione</SelectItem>
                            {availableEditions.map((ed) => (
                                <SelectItem key={ed.id} value={ed.id}>
                                    {ed.title} ({ed.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Annulla
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Creazione..." : "Crea Sessione"}
                </Button>
            </div>
        </form>
    );
}
