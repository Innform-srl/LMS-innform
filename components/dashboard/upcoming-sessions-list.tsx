
import { auth } from "@/lib/auth"
import { getUpcomingSessions } from "@/app/actions/live-sessions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JoinSessionButton } from "@/components/join-session-button"
import Link from "next/link"

export async function UpcomingSessionsList() {
    const session = await auth()
    if (!session?.user) return null

    const upcomingSessions = await getUpcomingSessions()

    if (upcomingSessions.length === 0) return null

    const now = new Date()
    const oneDayMs = 24 * 60 * 60 * 1000

    return (
        <Card className="glass border-border mb-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                    Prossime Live Session
                </CardTitle>
                <CardDescription>Non perdere le prossime lezioni in diretta</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingSessions.map(liveSession => (
                        <Card key={liveSession.id} className="bg-background/50 border-border">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold line-clamp-1">{liveSession.title}</h4>
                                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                                        {liveSession.startTime ? (() => { const d = new Date(liveSession.startTime!); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` })() : 'N/D'}
                                    </span>
                                </div>
                                {liveSession.course && (
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {liveSession.course.title}
                                    </p>
                                )}
                                {liveSession.startTime && (new Date(liveSession.startTime).getTime() - now.getTime()) <= oneDayMs && (
                                    <JoinSessionButton
                                        meetingUrl={liveSession.meetingUrl || ''}
                                        moduleId={liveSession.module?.id}
                                        liveSessionId={liveSession.id}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="mt-4 text-center">
                    <Link href="/live-sessions" className="text-sm text-muted-foreground hover:text-primary underline">
                        Vedi tutte le sessioni
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
