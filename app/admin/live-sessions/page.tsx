import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAllLiveSessions, deleteLiveSession } from "@/app/actions/live-sessions"
import { formatDate } from "@/lib/utils"

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
                            <Card key={session.id} className="bg-card border-border">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1 text-foreground">{session.title}</h3>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>📅 {session.startTime ? formatDate(session.startTime) : "Data non definita"}{session.endTime ? ` - ${session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}</p>
                                            {session.course && <p>📚 Corso: {session.course.title}</p>}
                                            <p>👤 Istruttore: {session.instructor.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
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
