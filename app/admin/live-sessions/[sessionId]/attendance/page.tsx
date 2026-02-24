import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSessionAttendance } from "@/app/actions/attendance"
import { AttendanceTable } from "./attendance-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, MapPin, Users, Video } from "lucide-react"
import { formatDateOnly, formatTime } from "@/lib/utils"

export default async function SessionAttendancePage({
    params
}: {
    params: Promise<{ sessionId: string }>
}) {
    const { sessionId } = await params
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const data = await getSessionAttendance(sessionId)
    if (!data) notFound()

    const { session: liveSession, stats } = data

    const sessionStart = liveSession.startTime ? new Date(liveSession.startTime) : null
    const sessionEnd = liveSession.endTime ? new Date(liveSession.endTime) : null
    const now = new Date()
    const isOngoing = sessionStart && sessionEnd ? now >= sessionStart && now <= sessionEnd : false
    const isEnded = sessionEnd ? now > sessionEnd : false

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/live-sessions"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Torna alle sessioni
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {liveSession.title.replace(/(\d{4})-(\d{2})-(\d{2})/, (_m, y, mo, d) => `${d}/${mo}/${y}`)}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {sessionStart && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDateOnly(sessionStart)}
                                    </span>
                                )}
                                {sessionStart && sessionEnd && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {formatTime(sessionStart)} - {formatTime(sessionEnd)}
                                    </span>
                                )}
                                {liveSession.physicalRoom && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {liveSession.physicalRoom.name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {stats.total} partecipanti
                                </span>
                            </div>
                            {liveSession.course && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Corso: {liveSession.course.title}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {isOngoing && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 animate-pulse whitespace-nowrap">
                                    In corso
                                </span>
                            )}
                            {isEnded && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 whitespace-nowrap">
                                    Terminata
                                </span>
                            )}
                            {liveSession.meetingUrl && (
                                <Link href={liveSession.meetingUrl} target="_blank">
                                    <Button variant="outline" size="sm" className="whitespace-nowrap">
                                        <Video className="w-4 h-4 mr-2" />
                                        Apri Meeting
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                            <div className="text-xs text-muted-foreground">Totale</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500/10 border-blue-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">{stats.registered}</div>
                            <div className="text-xs text-blue-400/70">Registrati</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{stats.present}</div>
                            <div className="text-xs text-green-400/70">Presenti</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-500/10 border-emerald-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{stats.attended}</div>
                            <div className="text-xs text-emerald-400/70">Completato</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-500/10 border-red-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-400">{stats.absent}</div>
                            <div className="text-xs text-red-400/70">Assenti</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-500/10 border-orange-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-400">{stats.late}</div>
                            <div className="text-xs text-orange-400/70">In ritardo</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-500/10 border-gray-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-gray-400">{stats.excused}</div>
                            <div className="text-xs text-gray-400/70">Giustificati</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Average Duration */}
                {stats.averageDuration > 0 && (
                    <Card className="bg-card border-border mb-8">
                        <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-muted-foreground">Durata media partecipazione</span>
                            <span className="text-xl font-bold text-foreground">
                                {stats.averageDuration >= 60
                                    ? `${Math.floor(stats.averageDuration / 60)}h ${stats.averageDuration % 60 > 0 ? `${stats.averageDuration % 60}min` : ""}`
                                    : `${stats.averageDuration} minuti`}
                            </span>
                        </CardContent>
                    </Card>
                )}

                {/* Attendance Table */}
                <AttendanceTable
                    sessionId={sessionId}
                    attendance={liveSession.attendance}
                    isEnded={isEnded}
                    googleMeetCode={liveSession.googleMeetCode}
                    unmatchedMeetParticipants={liveSession.unmatchedMeetParticipants as { displayName: string; email?: string; checkInTime: string | null; checkOutTime: string | null; durationMinutes: number; sessionCount: number; sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>; participantType: "google" | "anonymous" | "phone" }[] | null}
                    instructorId={liveSession.instructorId}
                />
            </div>
        </div>
    )
}
