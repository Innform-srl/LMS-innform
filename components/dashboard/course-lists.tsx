
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeadlineBadge } from "@/components/deadline-badge"
import { getTimeElapsed } from "@/lib/time-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export async function CourseLists() {
    const session = await auth()
    if (!session?.user) return null

    // Fetch enrollments without nested modules to reduce data transfer
    const enrollments = await db.enrollment.findMany({
        where: { userId: session.user.id },
        select: {
            id: true,
            progress: true,
            completed: true,
            completedAt: true,
            dueDate: true,
            timeSpent: true,
            createdAt: true,
            courseId: true,
            course: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    imageUrl: true,
                    isRequired: true,
                    minimumDuration: true,
                    _count: {
                        select: { modules: { where: effectivelyPublishedModuleWhere() } }
                    }
                }
            },
            certificate: {
                select: {
                    id: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    // Get aggregated video duration per course
    const inProgressCourseIds = enrollments.filter(e => !e.completed).map(e => e.courseId)
    const courseDurations = inProgressCourseIds.length > 0 ? await db.module.groupBy({
        by: ['courseId'],
        where: {
            courseId: { in: inProgressCourseIds },
            ...effectivelyPublishedModuleWhere()
        },
        _sum: { videoDuration: true }
    }) : []
    const durationMap = new Map(courseDurations.map(d => [d.courseId, d._sum.videoDuration || 0]))

    const upcomingDeadlines = enrollments.filter(e => {
        if (!e.dueDate || e.completed) return false
        const daysUntil = Math.ceil((new Date(e.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return daysUntil >= 0 && daysUntil <= 7
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

    const inProgressCourses = enrollments.filter(e => !e.completed)
    const completedCourses = enrollments.filter(e => e.completed)

    if (enrollments.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-24 h-24 bg-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">Inizia il tuo percorso</h3>
                <p className="text-muted-foreground mb-6">Non sei ancora iscritto a nessun corso</p>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/courses">
                        Esplora Catalogo
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            {/* Upcoming Deadlines Alert */}
            {upcomingDeadlines.length > 0 && (
                <Card className="glass border-border mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Corsi in Scadenza
                        </CardTitle>
                        <CardDescription>Completa questi corsi entro la scadenza</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {upcomingDeadlines.map(enrollment => (
                                <Link
                                    key={enrollment.id}
                                    href={`/courses/${enrollment.course.id}`}
                                    className="flex items-center justify-between p-4 glass border-border rounded-lg hover:bg-accent/50 transition-all"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{enrollment.course.title}</h4>
                                        <div className="flex flex-col gap-2 mt-2 w-full">
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Progresso Moduli: {Math.round(enrollment.progress)}%</span>
                                                {enrollment.course.minimumDuration > 0 && (
                                                    <span className={enrollment.timeSpent >= enrollment.course.minimumDuration * 60 ? "text-primary" : "text-muted-foreground"}>
                                                        {Math.floor(enrollment.timeSpent / 60)}m / {enrollment.course.minimumDuration}m
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${enrollment.progress}%` }}
                                                />
                                            </div>

                                            {enrollment.course.minimumDuration > 0 && (
                                                <div className="w-full bg-muted rounded-full h-1 mt-1">
                                                    <div
                                                        className={`h-1 rounded-full transition-all duration-500 ${enrollment.timeSpent >= enrollment.course.minimumDuration * 60
                                                            ? 'bg-primary'
                                                            : 'bg-muted-foreground'
                                                            }`}
                                                        style={{ width: `${Math.min((enrollment.timeSpent / (enrollment.course.minimumDuration * 60)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <DeadlineBadge dueDate={enrollment.dueDate!} />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* In Progress Courses */}
            {inProgressCourses.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-1 h-8 bg-blue-500 rounded-full" />
                        In Corso
                        <span className="ml-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-sm font-semibold rounded-full border border-blue-500/30">
                            {inProgressCourses.length} {inProgressCourses.length === 1 ? 'corso' : 'corsi'}
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inProgressCourses.map((enrollment) => (
                            <Card key={enrollment.id} className="glass border-blue-500/30 border-2 card-hover group relative overflow-hidden">
                                {/* Active indicator */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded border border-blue-500/30 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    IN CORSO
                                                </span>
                                            </div>
                                            <CardTitle className="text-xl transition-all">{enrollment.course.title}</CardTitle>
                                            <CardDescription className="text-muted-foreground">{enrollment.course.description}</CardDescription>
                                        </div>
                                        {enrollment.dueDate && !enrollment.completed && (
                                            <DeadlineBadge dueDate={enrollment.dueDate} size="sm" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-muted-foreground">Progresso Moduli</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground">
                                                        {getTimeElapsed(enrollment.createdAt)}
                                                    </span>
                                                    <span className="font-semibold text-primary">{Math.round(enrollment.progress)}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${enrollment.progress}%` }}
                                                />
                                            </div>

                                            {/* Course Duration Stats */}
                                            {(() => {
                                                const totalDuration = durationMap.get(enrollment.courseId) || 0
                                                const remainingDuration = Math.round(totalDuration * (100 - enrollment.progress) / 100)

                                                if (totalDuration > 0) {
                                                    const durationHours = Math.floor(totalDuration / 3600)
                                                    const durationMinutes = Math.floor((totalDuration % 3600) / 60)
                                                    const remHours = Math.floor(remainingDuration / 3600)
                                                    const remMinutes = Math.floor((remainingDuration % 3600) / 60)

                                                    return (
                                                        <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                                            <span>
                                                                Durata: {durationHours > 0 ? `${durationHours}h ` : ''}{durationMinutes}m
                                                            </span>
                                                            {enrollment.progress < 100 && remainingDuration > 0 && (
                                                                <span className="text-muted-foreground">
                                                                    Restano: {remHours > 0 ? `${remHours}h ` : ''}{remMinutes}m
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                }
                                                return null
                                            })()}

                                            {/* Time Tracking Indicator */}
                                            {enrollment.course.minimumDuration > 0 && (
                                                <div className="mt-2 pt-2 border-t border-border/50">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-muted-foreground">Tempo di Studio</span>
                                                        <span className={
                                                            enrollment.timeSpent >= enrollment.course.minimumDuration
                                                                ? 'text-primary font-semibold'
                                                                : 'text-muted-foreground'
                                                        }>
                                                            {Math.floor(enrollment.timeSpent / 3600)}h {Math.floor((enrollment.timeSpent % 3600) / 60)}m / {Math.floor(enrollment.course.minimumDuration / 60)}h
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${enrollment.timeSpent >= enrollment.course.minimumDuration
                                                                ? 'bg-primary'
                                                                : enrollment.timeSpent >= enrollment.course.minimumDuration * 0.5
                                                                    ? 'bg-secondary'
                                                                    : 'bg-muted'
                                                                }`}
                                                            style={{ width: `${Math.min((enrollment.timeSpent / enrollment.course.minimumDuration) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                            <Link href={`/courses/${enrollment.course.id}`}>
                                                Continua Corso
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Courses */}
            {completedCourses.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-1 h-8 bg-green-500 rounded-full" />
                        Corsi Completati
                        <span className="ml-2 px-3 py-1 bg-green-500/10 text-green-500 text-sm font-semibold rounded-full border border-green-500/30">
                            {completedCourses.length} {completedCourses.length === 1 ? 'completato' : 'completati'}
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedCourses.map((enrollment) => (
                            <Card key={enrollment.id} className="glass border-green-500/30 border-2 card-hover relative overflow-hidden">
                                {/* Completion indicator */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded border border-green-500/30 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            COMPLETATO
                                        </span>
                                        {enrollment.certificate && (
                                            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded border border-amber-500/30 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                                CERTIFICATO
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl">{enrollment.course.title}</CardTitle>
                                    <CardDescription className="text-muted-foreground">{enrollment.course.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground mb-2">
                                        <Link href={`/courses/${enrollment.course.id}`}>
                                            Rivedi Corso
                                        </Link>
                                    </Button>
                                    {enrollment.certificate && (
                                        <Button asChild className="w-full bg-green-600 text-white hover:bg-green-700">
                                            <Link href={`/api/certificates/${enrollment.certificate.id}/download`} target="_blank">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Scarica Certificato
                                            </Link>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
