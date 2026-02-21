"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserModuleTimeAnalytics } from "@/app/actions/reports"
import Link from "next/link"
import { Clock, BookOpen, CheckCircle2, Timer, TrendingUp, Loader2, GraduationCap, ChevronDown, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type ModuleAnalytics = {
    moduleId: string
    moduleTitle: string
    position: number
    contentType: string
    timeSpent: number
    watchedSeconds: number
    minimumDuration: number
    completed: boolean
    completedAt: Date | null
    lastActivity: Date | null
    timePercentage: number
}

type CourseAnalytics = {
    courseId: string
    courseTitle: string
    courseMinimumDuration: number
    enrollmentTimeSpent: number
    enrollmentProgress: number
    enrollmentCompleted: boolean
    totalTimeSpent: number
    completedModules: number
    totalModules: number
    modules: ModuleAnalytics[]
}

type AnalyticsData = {
    summary: {
        totalStudyTime: number
        totalCompletedModules: number
        totalModules: number
        totalCourses: number
        completedCourses: number
    }
    courses: CourseAnalytics[]
}

export default function MyAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const result = await getUserModuleTimeAnalytics()
        if (result.success && result.data) {
            setData(result.data)
            // Expand first course by default if exists
            if (result.data.courses.length > 0) {
                setExpandedCourses(new Set([result.data.courses[0].courseId]))
            }
        }
        setLoading(false)
    }

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    const formatDetailedTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    const toggleCourseExpand = (courseId: string) => {
        const newExpanded = new Set(expandedCourses)
        if (newExpanded.has(courseId)) {
            newExpanded.delete(courseId)
        } else {
            newExpanded.add(courseId)
        }
        setExpandedCourses(newExpanded)
    }

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return "bg-green-500"
        if (percentage >= 80) return "bg-yellow-500"
        if (percentage >= 50) return "bg-orange-500"
        return "bg-red-500"
    }

    const getContentTypeIcon = (contentType: string) => {
        switch (contentType) {
            case "PDF":
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )
            case "LIVE":
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground transition-colors duration-300">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <div className="text-center text-destructive">Errore nel caricamento dei dati</div>
            </div>
        )
    }

    const completionRate = data.summary.totalModules > 0
        ? Math.round((data.summary.totalCompletedModules / data.summary.totalModules) * 100)
        : 0

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Home
                    </Link>
                    <h1 className="text-4xl font-bold mt-2 flex items-center gap-3">
                        <TrendingUp className="w-10 h-10 text-primary" />
                        <span className="text-primary">Le Mie Analytics</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">Dettaglio del tempo trascorso su ogni modulo dei tuoi corsi</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Tempo Totale</CardDescription>
                                <Clock className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl text-primary">{formatTime(data.summary.totalStudyTime)}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">di studio</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Corsi</CardDescription>
                                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">
                                <span className="text-green-500">{data.summary.completedCourses}</span>
                                <span className="text-muted-foreground text-lg">/{data.summary.totalCourses}</span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">completati</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Moduli</CardDescription>
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">
                                <span className="text-green-500">{data.summary.totalCompletedModules}</span>
                                <span className="text-muted-foreground text-lg">/{data.summary.totalModules}</span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">completati</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Completamento</CardDescription>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl text-green-500">{completionRate}%</CardTitle>
                            <Progress value={completionRate} className="h-2 mt-2" />
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Media per Modulo</CardDescription>
                                <Timer className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">
                                {data.summary.totalModules > 0
                                    ? formatTime(Math.round(data.summary.totalStudyTime / data.summary.totalModules))
                                    : "0m"
                                }
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">per modulo</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Courses Detail */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Dettaglio per Corso
                    </h2>

                    {data.courses.length === 0 ? (
                        <Card className="bg-card border-border">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Non sei iscritto a nessun corso</p>
                                <Link href="/courses" className="text-primary hover:underline mt-2 inline-block">
                                    Esplora i corsi disponibili
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        data.courses.map(course => {
                            const isExpanded = expandedCourses.has(course.courseId)
                            const courseTimePercentage = course.courseMinimumDuration > 0
                                ? Math.min(Math.round((course.enrollmentTimeSpent / (course.courseMinimumDuration * 60)) * 100), 100)
                                : 100

                            return (
                                <Card key={course.courseId} className="bg-card border-border overflow-hidden">
                                    {/* Course Header */}
                                    <div
                                        onClick={() => toggleCourseExpand(course.courseId)}
                                        className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                                )}
                                                <div>
                                                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                                        {course.courseTitle}
                                                        {course.enrollmentCompleted && (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {course.completedModules}/{course.totalModules} moduli completati
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                {/* Course Progress */}
                                                <div className="text-right">
                                                    <div className="text-sm text-muted-foreground mb-1">Progresso</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all"
                                                                style={{ width: `${course.enrollmentProgress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-semibold">{Math.round(course.enrollmentProgress)}%</span>
                                                    </div>
                                                </div>
                                                {/* Course Time */}
                                                <div className="text-right min-w-[120px]">
                                                    <div className="text-sm text-muted-foreground mb-1">Tempo Totale</div>
                                                    <div className="text-xl font-bold text-primary">{formatTime(course.totalTimeSpent)}</div>
                                                    {course.courseMinimumDuration > 0 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Min: {course.courseMinimumDuration}m ({courseTimePercentage}%)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Module Details */}
                                    {isExpanded && (
                                        <div className="border-t border-border">
                                            <div className="p-4 bg-muted/30">
                                                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground px-4">
                                                    <div className="col-span-1">#</div>
                                                    <div className="col-span-4">Modulo</div>
                                                    <div className="col-span-2">Tipo</div>
                                                    <div className="col-span-2 text-right">Tempo</div>
                                                    <div className="col-span-2 text-center">Progresso</div>
                                                    <div className="col-span-1 text-center">Stato</div>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-border">
                                                {course.modules.map(module => (
                                                    <div
                                                        key={module.moduleId}
                                                        className="p-4 hover:bg-muted/30 transition-colors"
                                                    >
                                                        <div className="grid grid-cols-12 gap-4 items-center px-4">
                                                            {/* Position */}
                                                            <div className="col-span-1">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                    module.completed
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-muted text-muted-foreground'
                                                                }`}>
                                                                    {module.position}
                                                                </div>
                                                            </div>

                                                            {/* Title */}
                                                            <div className="col-span-4">
                                                                <div className="font-medium text-foreground">{module.moduleTitle}</div>
                                                                {module.lastActivity && (
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        Ultima attività: {new Date(module.lastActivity).toLocaleDateString("it-IT")}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Content Type */}
                                                            <div className="col-span-2">
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    {getContentTypeIcon(module.contentType)}
                                                                    <span className="text-sm">{module.contentType}</span>
                                                                </div>
                                                            </div>

                                                            {/* Time Spent */}
                                                            <div className="col-span-2 text-right">
                                                                <div className="font-semibold text-foreground">{formatDetailedTime(module.timeSpent)}</div>
                                                                {module.minimumDuration > 0 && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Min: {module.minimumDuration}m
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="col-span-2">
                                                                {module.minimumDuration > 0 ? (
                                                                    <div>
                                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all ${getProgressColor(module.timePercentage)}`}
                                                                                style={{ width: `${module.timePercentage}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="text-xs text-center text-muted-foreground mt-1">
                                                                            {module.timePercentage}%
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center text-xs text-muted-foreground">
                                                                        Nessun limite
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Status */}
                                                            <div className="col-span-1 text-center">
                                                                {module.completed ? (
                                                                    <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Course Footer */}
                                            <div className="p-4 bg-muted/30 border-t border-border">
                                                <div className="flex justify-between items-center px-4">
                                                    <Link
                                                        href={`/courses/${course.courseId}`}
                                                        className="text-primary hover:underline text-sm font-medium"
                                                    >
                                                        Continua il corso &rarr;
                                                    </Link>
                                                    <div className="text-sm text-muted-foreground">
                                                        Tempo medio per modulo: <span className="font-semibold text-foreground">
                                                            {course.totalModules > 0
                                                                ? formatTime(Math.round(course.totalTimeSpent / course.totalModules))
                                                                : "0m"
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
