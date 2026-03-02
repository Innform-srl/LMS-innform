
import { auth } from "@/lib/auth"
import { getUpcomingSessions } from "@/app/actions/live-sessions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JoinSessionButton } from "@/components/join-session-button"
import Link from "next/link"

function formatSessionDate(date: Date) {
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} ${hours}:${minutes}`
}

export async function UpcomingSessionsList() {
    const session = await auth()
    if (!session?.user) return null

    const upcomingSessions = await getUpcomingSessions()

    if (upcomingSessions.length === 0) return null

    const now = new Date()
    const oneDayMs = 24 * 60 * 60 * 1000
    const twoDaysMs = 2 * oneDayMs

    return (
        <Card className="glass border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <CardHeader className="pb-3">
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
                <div className="space-y-2">
                    {upcomingSessions.map(liveSession => {
                        const timeUntilStart = liveSession.startTime ? new Date(liveSession.startTime).getTime() - now.getTime() : Infinity
                        const canJoin = timeUntilStart <= oneDayMs
                        const isSoon = timeUntilStart > oneDayMs && timeUntilStart <= twoDaysMs

                        return (
                            <div key={liveSession.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{liveSession.title.replace(/(\d{4})-(\d{2})-(\d{2})/, (_m, y, mo, d) => `${d}/${mo}/${y}`)}</p>
                                    <div className="flex items-center gap-2">
                                        {liveSession.course && (
                                            <span className="text-xs text-muted-foreground truncate">{liveSession.course.title}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                                        {liveSession.startTime ? formatSessionDate(new Date(liveSession.startTime)) : 'N/D'}
                                    </span>
                                    {canJoin ? (
                                        <JoinSessionButton
                                            meetingUrl={liveSession.meetingUrl || ''}
                                            moduleId={liveSession.module?.id}
                                            liveSessionId={liveSession.id}
                                        />
                                    ) : isSoon ? (
                                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                                            A breve
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-3 text-center">
                    <Link href="/live-sessions" className="text-xs text-muted-foreground hover:text-primary underline">
                        Vedi tutte le sessioni
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
