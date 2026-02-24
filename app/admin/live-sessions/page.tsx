import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAllLiveSessions, deleteLiveSession, toggleSessionVisibility } from "@/app/actions/live-sessions"
import { formatTime } from "@/lib/utils"

export default async function AdminLiveSessionsPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const liveSessions = await getAllLiveSessions()

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Aula Virtuale</h1>
                        <p className="text-muted-foreground">Gestisci le sessioni live e i webinar</p>
                    </div>
                    <Link href="/admin/live-sessions/create">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            + Nuova Sessione
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4">
                    {liveSessions.length === 0 ? (
                        <Card className="bg-card border-border">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                Nessuna sessione programmata.
                            </CardContent>
                        </Card>
                    ) : (
                        liveSessions.map((session) => (
                            <Card key={session.id} className={`bg-card border-border ${session.hiddenFromStudents ? "opacity-60" : ""}`}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-semibold text-foreground">{session.title.replace(/(\d{4})-(\d{2})-(\d{2})/, (_m, y, mo, d) => `${d}/${mo}/${y}`)}</h3>
                                            {session.hiddenFromStudents && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                                                    Nascosta
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>🕐 {session.startTime ? formatTime(session.startTime) : "Orario non definito"}{session.endTime ? ` - ${formatTime(session.endTime)}` : ""}</p>
                                            {session.course && <p>📚 Corso: {session.course.title}</p>}
                                            <p>👤 Istruttore: {session.instructor.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <form action={async () => {
                                            "use server"
                                            await toggleSessionVisibility(session.id)
                                        }}>
                                            <Button variant="outline" size="sm" type="submit" title={session.hiddenFromStudents ? "Rendi visibile ai partecipanti" : "Nascondi ai partecipanti"}>
                                                {session.hiddenFromStudents ? "👁️ Mostra" : "🙈 Nascondi"}
                                            </Button>
                                        </form>
                                        <Link href={`/admin/live-sessions/${session.id}/attendance`}>
                                            <Button variant="outline" size="sm">Presenze</Button>
                                        </Link>
                                        {session.meetingUrl && (
                                            <Link href={session.meetingUrl} target="_blank">
                                                <Button variant="outline" size="sm">Link Meeting</Button>
                                            </Link>
                                        )}
                                        <Link href={`/admin/live-sessions/${session.id}/edit`}>
                                            <Button variant="outline" size="sm">Modifica</Button>
                                        </Link>
                                        <form action={async () => {
                                            "use server"
                                            await deleteLiveSession(session.id)
                                        }}>
                                            <Button variant="destructive" size="sm" type="submit">
                                                Elimina
                                            </Button>
                                        </form>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
