import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDateOnly, formatTime } from "@/lib/utils"

export default async function UserReportPage({
    params
}: {
    params: Promise<{ userId: string }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/login")

    const { userId } = await params

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            enrollments: {
                include: {
                    course: true
                }
            },
            quizAttempts: {
                include: {
                    quiz: true
                },
                orderBy: { completedAt: 'desc' }
            }
        }
    })

    if (!user) return <div>Utente non trovato</div>

    const completedCourses = user.enrollments.filter(e => e.completed).length
    const avgScore = user.quizAttempts.length > 0
        ? Math.round(user.quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / user.quizAttempts.length)
        : 0

    const loginHistory = await db.auditLog.findMany({
        where: {
            userId: userId,
            action: "LOGIN"
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    const totalTimeSeconds = await db.moduleProgress.aggregate({
        where: { userId: userId },
        _sum: { watchedSeconds: true }
    })

    const totalSeconds = totalTimeSeconds._sum.watchedSeconds || 0
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const timeString = `${hours}h ${minutes}m`

    const lastLogin = loginHistory[0]?.createdAt

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
                <Link href="/admin/users">
                    <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                        Torna alla lista
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Corsi Completati</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-400">
                            {completedCourses} / {user.enrollments.length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Totale</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-400">{timeString}</div>
                    </CardContent>
                </Card>
                <Card className="glass border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Media Quiz</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{avgScore}%</div>
                    </CardContent>
                </Card>
                <Card className="glass border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ultimo Accesso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-blue-400">
                            {lastLogin ? formatDateOnly(new Date(lastLogin)) : 'Mai'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {lastLogin ? formatTime(new Date(lastLogin)) : '-'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Course Progress */}
                <Card className="glass border-border">
                    <CardHeader>
                        <CardTitle>Progressi Corsi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {user.enrollments.map(enrollment => (
                                <div key={enrollment.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-medium text-foreground">{enrollment.course.title}</span>
                                        <span className={enrollment.completed ? "text-green-400" : "text-blue-400"}>
                                            {enrollment.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${enrollment.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${enrollment.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {user.enrollments.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">Nessun corso assegnato</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    {/* Quiz History */}
                    <Card className="glass border-border">
                        <CardHeader>
                            <CardTitle>Storico Quiz</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {user.quizAttempts.map(attempt => (
                                    <div key={attempt.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                                        <div>
                                            <p className="font-medium text-foreground">{attempt.quiz.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDateOnly(new Date(attempt.completedAt))}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${attempt.passed
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {attempt.score}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {user.quizAttempts.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">Nessun quiz completato</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Login History */}
                    <Card className="glass border-border">
                        <CardHeader>
                            <CardTitle>Ultimi Accessi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {loginHistory.map(log => (
                                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Login effettuato</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateOnly(new Date(log.createdAt))} alle {formatTime(new Date(log.createdAt))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {loginHistory.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">Nessun accesso registrato</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
