"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getEngagementReport, exportEngagementCSV } from "@/app/actions/reports"
import Link from "next/link"
import { RefreshCw, Users, Clock, BookOpen, CheckCircle, TrendingUp, AlertTriangle, Download } from "lucide-react"

type EngagementData = {
    overview: {
        totalUsers: number
        activeUsersLast7Days: number
        activeUsersLast30Days: number
        totalEnrollments: number
        completedEnrollments: number
        completionRate: number
        totalStudyTimeMinutes: number
        avgStudyTimePerUser: number
        tmsSyncedEnrollments: number
    }
    quizStats: {
        totalAttempts: number
        passedAttempts: number
        passRate: number
        avgScore: number
    }
    topCourses: Array<{
        courseId: string
        courseTitle: string
        enrollments: number
        completions: number
        totalTime: number
        avgTime: number
    }>
    topUsers: Array<{
        userId: string
        userName: string
        userEmail: string | null
        department: string | null
        studyTime: number
        modulesCompleted: number
        quizzesPassed: number
        lastActivity: Date | null
    }>
    inactiveUsersCount: number
}

export default function EngagementReportPage() {
    const [data, setData] = useState<EngagementData | null>(null)
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        setLoading(true)
        const result = await getEngagementReport()
        if (result.success && result.data) {
            setData(result.data as EngagementData)
        }
        setLoading(false)
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData()
    }, [])

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    const handleExportCSV = async () => {
        const result = await exportEngagementCSV()
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `engagement-report-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-3 text-lg">Caricamento report...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-background text-foreground p-8">
                <div className="max-w-7xl mx-auto text-center py-20">
                    <p className="text-muted-foreground">Errore nel caricamento dei dati</p>
                    <Button onClick={loadData} className="mt-4">Riprova</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Dashboard Admin
                    </Link>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-foreground mb-2">Report Engagement LMS</h1>
                            <p className="text-muted-foreground">Analisi completa dell&apos;utilizzo e coinvolgimento della piattaforma</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleExportCSV} variant="outline" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                            <Button onClick={loadData} variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Aggiorna
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Utenti Totali</CardDescription>
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">{data.overview.totalUsers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                <span className="text-green-500 font-medium">{data.overview.activeUsersLast7Days}</span> attivi ultimi 7gg
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Tempo Studio Totale</CardDescription>
                                <Clock className="w-5 h-5 text-blue-500" />
                            </div>
                            <CardTitle className="text-3xl">{formatTime(data.overview.totalStudyTimeMinutes)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                Media: <span className="font-medium">{formatTime(data.overview.avgStudyTimePerUser)}</span>/utente
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Tasso Completamento</CardDescription>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <CardTitle className="text-3xl">{data.overview.completionRate.toFixed(1)}%</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                {data.overview.completedEnrollments}/{data.overview.totalEnrollments} iscrizioni
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Utenti Inattivi</CardDescription>
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                            </div>
                            <CardTitle className="text-3xl text-orange-500">{data.inactiveUsersCount}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                Nessuna attività da 30+ giorni
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quiz Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-card border-border col-span-1 md:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Statistiche Quiz
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <div className="text-sm text-muted-foreground">Tentativi Totali</div>
                                    <div className="text-2xl font-bold">{data.quizStats.totalAttempts}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Superati</div>
                                    <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        {data.quizStats.passedAttempts}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Tasso Superamento</div>
                                    <div className="text-2xl font-bold">{data.quizStats.passRate.toFixed(1)}%</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Punteggio Medio</div>
                                    <div className="text-2xl font-bold">{data.quizStats.avgScore.toFixed(1)}%</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TMS Sync Stats */}
                {data.overview.tmsSyncedEnrollments > 0 && (
                    <Card className="bg-purple-500/10 border-purple-500/30 mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-400">
                                <RefreshCw className="w-5 h-5" />
                                Sincronizzazione TMS
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-8">
                                <div>
                                    <div className="text-sm text-muted-foreground">Iscrizioni da TMS</div>
                                    <div className="text-2xl font-bold text-purple-400">{data.overview.tmsSyncedEnrollments}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">% del Totale</div>
                                    <div className="text-2xl font-bold">
                                        {((data.overview.tmsSyncedEnrollments / data.overview.totalEnrollments) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Courses */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Top 10 Corsi per Iscrizioni</CardTitle>
                            <CardDescription>I corsi più popolari sulla piattaforma</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.topCourses.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nessun dato disponibile</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.topCourses.map((course, index) => (
                                        <div key={course.courseId} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{course.courseTitle}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {course.enrollments} iscritti | {course.completions} completati | Media: {formatTime(course.avgTime)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-green-500">
                                                    {course.enrollments > 0 ? ((course.completions / course.enrollments) * 100).toFixed(0) : 0}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">completato</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Users */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Top 10 Utenti per Tempo Studio</CardTitle>
                            <CardDescription>Gli utenti più attivi sulla piattaforma</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.topUsers.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nessun dato disponibile</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.topUsers.map((user, index) => (
                                        <div key={user.userId} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{user.userName}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {user.modulesCompleted} moduli | {user.quizzesPassed} quiz superati
                                                    {user.department && ` | ${user.department}`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-primary">
                                                    {formatTime(user.studyTime)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {user.lastActivity
                                                        ? `Ultimo: ${new Date(user.lastActivity).toLocaleDateString("it-IT")}`
                                                        : "Nessuna attività"
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation Links */}
                <div className="mt-8 flex gap-4">
                    <Link href="/admin/reports/time-tracking">
                        <Button variant="outline">
                            <Clock className="w-4 h-4 mr-2" />
                            Report Time Tracking Dettagliato
                        </Button>
                    </Link>
                    <Link href="/admin/analytics">
                        <Button variant="outline">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Analytics
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
