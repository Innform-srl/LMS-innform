"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BookOpen, Award, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { apiUrl } from "@/lib/api"
import { formatDateOnly } from "@/lib/utils"

const AnalyticsProgressChart = dynamic(() => import("./analytics-progress-chart"), {
    loading: () => (
        <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    ),
    ssr: false,
})

type UserAnalyticsData = {
    overview: {
        totalEnrollments: number
        completedCourses: number
        inProgressCourses: number
        totalCertificates: number
        totalTimeSpent: number
        completionRate: number
    }
    progressTrend: Array<{ month: string; completed: number; enrolled: number }>
    upcomingDeadlines: Array<{
        courseTitle: string
        dueDate: Date
        progress: number
        courseId: string
    }>
    recentAchievements: Array<{
        courseTitle: string
        completedAt: Date
        hasCertificate: boolean
        certificateNumber?: string
    }>
}

export default function UserAnalyticsPage() {
    const [data, setData] = useState<UserAnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(apiUrl('/api/user/analytics'))
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive">Errore nel caricamento dei dati</h2>
                </div>
            </div>
        )
    }

    const { overview, progressTrend, upcomingDeadlines, recentAchievements } = data

    const hours = Math.floor(overview.totalTimeSpent / 60)
    const minutes = overview.totalTimeSpent % 60

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold mt-2">
                        <span className="gradient-text">Le Tue Statistiche</span>
                    </h1>
                    <p className="text-gray-400 mt-2">Monitora il tuo percorso di apprendimento</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-gray-400">Corsi Totali</CardTitle>
                                <BookOpen className="w-4 h-4 text-blue-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">{overview.totalEnrollments}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {overview.inProgressCourses} in corso
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-gray-400">Completati</CardTitle>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">{overview.completedCourses}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Tasso: {overview.completionRate}%
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-gray-400">Certificati</CardTitle>
                                <Award className="w-4 h-4 text-yellow-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">{overview.totalCertificates}</div>
                            <Link href="/certificates">
                                <Button variant="link" className="text-xs p-0 h-auto text-primary hover:text-primary/80">
                                    Vedi tutti →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-gray-400">Tempo Totale</CardTitle>
                                <Clock className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">
                                {hours}h {minutes}m
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Tempo di studio
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Chart - Lazy loaded */}
                <AnalyticsProgressChart progressTrend={progressTrend} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Deadlines */}
                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-400" />
                                <CardTitle>Prossime Scadenze</CardTitle>
                            </div>
                            <p className="text-sm text-gray-400">Corsi con deadline imminenti</p>
                        </CardHeader>
                        <CardContent>
                            {upcomingDeadlines.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nessuna scadenza imminente</p>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingDeadlines.map((deadline, index) => {
                                        const daysLeft = Math.ceil((new Date(deadline.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                        const isUrgent = daysLeft <= 3

                                        return (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-lg border transition-colors ${isUrgent
                                                    ? 'bg-red-500/10 border-red-500/30'
                                                    : 'bg-muted border-border'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-semibold text-white">{deadline.courseTitle}</h4>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isUrgent
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : 'bg-blue-500/20 text-blue-300'
                                                        }`}>
                                                        {daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 bg-gray-700 rounded-full flex-1">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${deadline.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400">{deadline.progress}%</span>
                                                </div>
                                                <Link href={`/courses/${deadline.courseId}`}>
                                                    <Button size="sm" className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                                        Continua Corso
                                                    </Button>
                                                </Link>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Achievements */}
                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-green-400" />
                                <CardTitle>Ultimi Traguardi</CardTitle>
                            </div>
                            <p className="text-sm text-gray-400">Corsi completati recentemente</p>
                        </CardHeader>
                        <CardContent>
                            {recentAchievements.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nessun corso completato ancora</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentAchievements.map((achievement, index) => (
                                        <div
                                            key={index}
                                            className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                                    {achievement.hasCertificate ? (
                                                        <Award className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-white mb-1">{achievement.courseTitle}</h4>
                                                    <p className="text-xs text-gray-400">
                                                        Completato il {formatDateOnly(new Date(achievement.completedAt))}
                                                    </p>
                                                    {achievement.hasCertificate && achievement.certificateNumber && (
                                                        <p className="text-xs text-green-400 mt-1">
                                                            ✓ Certificato N° {achievement.certificateNumber}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
