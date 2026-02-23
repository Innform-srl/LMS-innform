import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getLiveSessions } from "@/app/actions/live-sessions"
import { formatDate } from "@/lib/utils"
import { JoinSessionButton } from "@/components/join-session-button"

export default async function LiveSessionsPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const allSessions = await getLiveSessions()
    const now = new Date()

    const upcomingSessions = allSessions.filter(s => !s.endTime || new Date(s.endTime) >= now)
    const pastSessions = allSessions.filter(s => s.endTime && new Date(s.endTime) < now)
    const oneDayMs = 24 * 60 * 60 * 1000

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Aula Virtuale</h1>
                        <p className="text-muted-foreground">Il tuo calendario delle lezioni in diretta</p>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="outline">
                            Torna alla Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="space-y-12">
                    {/* Upcoming */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-primary rounded-full" />
                            In Programma
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingSessions.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                    <p>Nessuna sessione in programma.</p>
                                </div>
                            ) : (
                                upcomingSessions.map((session) => (
                                    <Card key={session.id} className="bg-card border-border hover:shadow-lg transition-all flex flex-col h-full">
                                        <CardContent className="p-6 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                                    {session.startTime ? formatDate(session.startTime) : "Da definire"}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold mb-2 line-clamp-2">{session.title}</h3>
                                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                                                {session.description || "Nessuna descrizione disponibile."}
                                            </p>

                                            <div className="space-y-3 mt-auto">
                                                {session.course && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>📚</span>
                                                        <span className="truncate">{session.course.title}</span>
                                                    </div>
                                                )}

                                                {session.startTime && (new Date(session.startTime).getTime() - now.getTime()) <= oneDayMs ? (
                                                    <JoinSessionButton
                                                        meetingUrl={session.meetingUrl || ""}
                                                        liveSessionId={session.id}
                                                    />
                                                ) : session.startTime ? (
                                                    <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
                                                        Disponibile dal {(() => { const d = new Date(new Date(session.startTime).getTime() - oneDayMs); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` })()}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Past */}
                    {pastSessions.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-muted-foreground">
                                <span className="w-1 h-6 bg-muted rounded-full" />
                                Sessioni Passate
                            </h2>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-75">
                                {pastSessions.map((session) => (
                                    <Card key={session.id} className="bg-muted/30 border-border h-full">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-muted-foreground line-clamp-1">{session.title}</h4>
                                                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                                    {session.startTime ? formatDate(session.startTime) : ""}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Conclusa
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
