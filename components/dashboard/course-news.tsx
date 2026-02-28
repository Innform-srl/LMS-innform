import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

function timeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return "Ora"
    if (diffMin < 60) return `${diffMin}m fa`
    if (diffHours < 24) return `${diffHours}h fa`
    if (diffDays === 1) return "Ieri"
    if (diffDays < 7) return `${diffDays}g fa`
    return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })
}

function ContentTypeIcon({ type }: { type: string | null }) {
    if (type === "PDF") {
        return (
            <div className="w-7 h-7 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>
        )
    }
    if (type === "LIVE") {
        return (
            <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </div>
        )
    }
    return (
        <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
    )
}

export async function CourseNews() {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = session.user.id
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentModules = await db.module.findMany({
        where: {
            ...effectivelyPublishedModuleWhere(),
            updatedAt: { gte: thirtyDaysAgo },
            course: {
                published: true,
                enrollments: { some: { userId } }
            }
        },
        select: {
            id: true,
            title: true,
            contentType: true,
            createdAt: true,
            updatedAt: true,
            courseId: true,
            course: {
                select: {
                    id: true,
                    title: true,
                    _count: { select: { modules: { where: effectivelyPublishedModuleWhere() } } },
                    enrollments: {
                        where: { userId },
                        select: { progress: true, completed: true }
                    }
                }
            },
            moduleProgress: {
                where: { userId },
                select: { completed: true }
            }
        },
        orderBy: { updatedAt: "desc" },
        take: 15
    })

    if (recentModules.length === 0) {
        return (
            <Card className="glass border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded-full" />
                        Novit&agrave; dai tuoi corsi
                    </CardTitle>
                    <CardDescription>Aggiornamenti recenti dai corsi a cui sei iscritto</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                        </div>
                        <p className="text-sm text-muted-foreground">Nessuna novit&agrave; recente</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Group modules by course
    const courseMap = new Map<string, {
        courseId: string
        courseTitle: string
        progress: number
        completed: boolean
        totalModules: number
        modules: typeof recentModules
    }>()

    for (const mod of recentModules) {
        if (!courseMap.has(mod.courseId)) {
            const enrollment = mod.course.enrollments[0]
            courseMap.set(mod.courseId, {
                courseId: mod.course.id,
                courseTitle: mod.course.title,
                progress: enrollment ? Math.round(enrollment.progress) : 0,
                completed: enrollment?.completed ?? false,
                totalModules: mod.course._count.modules,
                modules: []
            })
        }
        courseMap.get(mod.courseId)!.modules.push(mod)
    }

    return (
        <Card className="glass border-border h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full" />
                    Novit&agrave; dai tuoi corsi
                </CardTitle>
                <CardDescription>Aggiornamenti recenti dai corsi a cui sei iscritto</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {Array.from(courseMap.values()).map((course) => (
                        <div key={course.courseId}>
                            {/* Course header */}
                            <Link
                                href={`/courses/${course.courseId}`}
                                className="flex items-center justify-between mb-2 group"
                            >
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                    {course.courseTitle}
                                </h4>
                                <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${
                                    course.completed ? "text-green-600" : "text-muted-foreground"
                                }`}>
                                    {course.completed ? "Completato" : `${course.progress}%`}
                                </span>
                            </Link>
                            {/* Course progress bar */}
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all ${course.completed ? "bg-green-500" : "bg-primary"}`}
                                    style={{ width: `${course.progress}%` }}
                                />
                            </div>
                            {/* Module list */}
                            <div className="space-y-0.5">
                                {course.modules.map((mod) => {
                                    const isNew = mod.createdAt.getTime() === mod.updatedAt.getTime()
                                    const moduleCompleted = mod.moduleProgress[0]?.completed ?? false

                                    return (
                                        <div
                                            key={mod.id}
                                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg"
                                        >
                                            <ContentTypeIcon type={mod.contentType ?? null} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">
                                                    {mod.title}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                        isNew
                                                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                    }`}>
                                                        {isNew ? "Nuovo" : "Aggiornato"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {timeAgo(mod.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            {moduleCompleted ? (
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
