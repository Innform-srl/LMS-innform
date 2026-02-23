import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRegister, getTeachersForRegister } from "@/app/actions/registers"
import { formatDate, formatTime } from "@/lib/utils"
import { RegisterActions } from "./register-actions"
import { AddEntryForm } from "./add-entry-form"
import { ParticipantsSection } from "./participants-section"
import { InstructorsSection } from "./instructors-section"
import { ElearningSync } from "./elearning-sync"
import { AttendanceSync } from "./attendance-sync"
import { ExportButton } from "./export-button"
import { PDFDownloadButton } from "./pdf-download-button"

const statusLabels: Record<string, string> = {
    DRAFT: "Bozza",
    ACTIVE: "Attivo",
    CLOSED: "Chiuso",
    ARCHIVED: "Archiviato",
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-500/20 text-yellow-600",
    ACTIVE: "bg-green-500/20 text-green-600",
    CLOSED: "bg-red-500/20 text-red-600",
    ARCHIVED: "bg-gray-500/20 text-gray-600",
}

const deliveryModeLabels: Record<string, string> = {
    IN_PERSON: "Aula",
    ONLINE: "Online",
    ELEARNING: "E-Learning",
}

function formatHours(hours: number): string {
    if (hours === 0) return "0min"
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

export default async function RegisterDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { id } = await params
    const [register, teacherUsers] = await Promise.all([
        getRegister(id),
        getTeachersForRegister(id),
    ])
    if (!register) notFound()

    const totalEffectiveHours = register.entries.reduce((sum, e) => sum + e.effectiveHours, 0)
    const totalElearningHours = register.participants.reduce((sum, p) => sum + p.elearningHours, 0)
    const avgElearning = register.participants.length > 0
        ? Math.round((totalElearningHours / register.participants.length) * 10) / 10
        : 0
    const compliantCount = register.participants.filter((p) => p.isCompliant).length
    const atRiskCount = register.participants.filter((p) => {
        if (p.isCompliant) return false
        const total = p.totalHours + p.elearningHours
        const pct = register.plannedHours > 0 ? (total / register.plannedHours) * 100 : 0
        return pct >= register.complianceThreshold * 0.7
    }).length
    const isEditable = register.status !== "CLOSED" && register.status !== "ARCHIVED"
    const totalInstructorHours = register.instructors.reduce((sum, i) => sum + i.totalHours, 0)

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href="/admin/registers" className="text-muted-foreground hover:text-foreground text-sm">
                                Registri
                            </Link>
                            <span className="text-muted-foreground">/</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">{register.title}</h1>
                        <p className="text-muted-foreground mt-1">
                            {register.course.title}
                            {register.projectCode && ` - ${register.projectCode}`}
                            {register.fundingBody && ` (${register.fundingBody})`}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[register.status]}`}>
                                {statusLabels[register.status]}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {register.registerType === "FUNDED" ? "Finanziato" : "Interno"}
                            </span>
                            {register.trainingLocation && (
                                <span className="text-xs text-muted-foreground">
                                    {register.trainingLocation}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        <RegisterActions register={register} />
                        <div className="flex gap-2 flex-wrap justify-end">
                            <PDFDownloadButton registerId={register.id} />
                            <AttendanceSync registerId={register.id} isEditable={isEditable} />
                            <ElearningSync registerId={register.id} />
                            <ExportButton registerId={register.id} />
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">{register.entries.length}</p>
                            <p className="text-xs text-muted-foreground">Giornate</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">
                                {formatHours(totalEffectiveHours)} / {register.plannedHours}h
                            </p>
                            <p className="text-xs text-muted-foreground">Ore Aula / Previste</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">{formatHours(avgElearning)}</p>
                            <p className="text-xs text-muted-foreground">Media E-Learning</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{compliantCount}</p>
                            <p className="text-xs text-muted-foreground">
                                Conformi
                                {atRiskCount > 0 && (
                                    <span className="text-yellow-600"> ({atRiskCount} a rischio)</span>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">
                                {formatHours(totalInstructorHours)}
                            </p>
                            <p className="text-xs text-muted-foreground">{register.instructors.length} Docenti</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Nav */}
                <div className="flex gap-2 mb-8">
                    <Link href={`/admin/registers/${id}/participants`}>
                        <Button variant="outline" size="sm">
                            Gestione Partecipanti ({register.participants.length})
                        </Button>
                    </Link>
                    <Link href={`/admin/registers/${id}/instructors`}>
                        <Button variant="outline" size="sm">
                            Gestione Docenti ({register.instructors.length})
                        </Button>
                    </Link>
                </div>

                {/* Giornate Formative */}
                <Card className="bg-card border-border mb-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Giornate Formative</CardTitle>
                        {isEditable && <AddEntryForm registerId={register.id} />}
                    </CardHeader>
                    <CardContent>
                        {register.entries.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">
                                Nessuna giornata formativa. Aggiungi la prima giornata.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {register.entries.map((entry, index) => (
                                    <Link
                                        key={entry.id}
                                        href={`/admin/registers/${register.id}/entry/${entry.id}`}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-muted-foreground w-8">
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {formatDate(entry.date)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTime(new Date(entry.startTime))}
                                                    {" - "}
                                                    {formatTime(new Date(entry.endTime))}
                                                    {entry.pauseMinutes > 0 && ` (pausa ${entry.pauseMinutes}min)`}
                                                    {" - "}
                                                    {formatHours(entry.effectiveHours)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                                                {deliveryModeLabels[entry.deliveryMode]}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {entry._count.attendances} presenze
                                            </span>
                                            {entry.instructorEntries.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {entry.instructorEntries.map((ie) => ie.instructor.name).join(", ")}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monte Ore Partecipanti */}
                <ParticipantsSection register={register} isEditable={isEditable} />

                {/* Docenti */}
                <InstructorsSection register={register} isEditable={isEditable} teacherUsers={teacherUsers} />
            </div>
        </div>
    )
}
