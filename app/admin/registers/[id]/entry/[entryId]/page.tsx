import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getEntry } from "@/app/actions/registers"
import { formatDate, formatTime } from "@/lib/utils"
import { AttendanceGrid } from "./attendance-grid"
import { InstructorEntrySection } from "./instructor-entry-section"

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

export default async function EntryPage({
    params,
}: {
    params: Promise<{ id: string; entryId: string }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { id, entryId } = await params
    const entry = await getEntry(entryId)
    if (!entry) notFound()

    const isEditable =
        entry.register.status !== "CLOSED" && entry.register.status !== "ARCHIVED"

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-1 text-sm">
                    <Link href="/admin/registers" className="text-muted-foreground hover:text-foreground">
                        Registri
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <Link href={`/admin/registers/${id}`} className="text-muted-foreground hover:text-foreground">
                        {entry.register.title || "Registro"}
                    </Link>
                    <span className="text-muted-foreground">/</span>
                </div>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Giornata del {formatDate(entry.date)}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>
                            {formatTime(new Date(entry.startTime))}
                            {" - "}
                            {formatTime(new Date(entry.endTime))}
                        </span>
                        {entry.pauseMinutes > 0 && <span>Pausa: {entry.pauseMinutes} min</span>}
                        <span>Ore effettive: {formatHours(entry.effectiveHours)}</span>
                        <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">
                            {deliveryModeLabels[entry.deliveryMode]}
                        </span>
                    </div>
                </div>

                {/* Argomenti */}
                <div className="mb-8 p-4 rounded-lg border border-border bg-card">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Argomenti Trattati
                    </h3>
                    <p className="text-foreground whitespace-pre-wrap">{entry.topics}</p>
                    {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-2">Note: {entry.notes}</p>
                    )}
                </div>

                {/* Attendance Grid */}
                <AttendanceGrid
                    entryId={entry.id}
                    registerId={id}
                    effectiveHours={entry.effectiveHours}
                    participants={entry.register.participants}
                    existingAttendances={entry.attendances}
                    hasLiveSession={!!entry.liveSessionId}
                    isEditable={isEditable}
                />

                {/* Instructor Entries */}
                <InstructorEntrySection
                    entryId={entry.id}
                    registerId={id}
                    effectiveHours={entry.effectiveHours}
                    instructors={entry.register.instructors}
                    existingEntries={entry.instructorEntries}
                    isEditable={isEditable}
                />
            </div>
        </div>
    )
}
