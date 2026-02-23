import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { CourseActions } from "./course-actions"
import { formatDateOnly } from "@/lib/utils"

export default async function CoursesPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const courses = await db.course.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { modules: true, enrollments: true } },
            enrollments: {
                where: {
                    completed: false,
                    dueDate: { not: null }
                },
                select: {
                    dueDate: true
                }
            }
        }
    })

    // Separate active and archived courses
    const activeCourses = courses.filter(c => !c.archived)
    const archivedCourses = courses.filter(c => c.archived)

    // Calculate expiring/expired enrollments per course
    const now = new Date()
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const activeCoursesWithDeadlines = activeCourses.map(course => {
        const expiring = course.enrollments.filter(e =>
            e.dueDate && e.dueDate <= in7Days && e.dueDate >= now
        )
        const expired = course.enrollments.filter(e =>
            e.dueDate && e.dueDate < now
        )
        return {
            ...course,
            expiringCount: expiring.length,
            expiredCount: expired.length
        }
    })

    const archivedCoursesWithData = archivedCourses.map(course => ({
        ...course,
        expiringCount: 0,
        expiredCount: 0
    }))

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2 text-primary">
                                Gestione Corsi
                            </h1>
                            <p className="text-muted-foreground">Crea, modifica e gestisci i tuoi corsi</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/admin/courses/create">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Nuovo Corso
                                </Button>
                            </Link>
                            <Link href="/admin">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Dashboard Admin
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="glass border-border card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm font-medium mb-1">Totale</div>
                                    <div className="text-3xl font-bold text-primary">{activeCourses.length}</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="glass border-border card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm font-medium mb-1">Pubblicati</div>
                                    <div className="text-3xl font-bold text-success">
                                        {activeCourses.filter(c => c.published).length}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="glass border-border card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm font-medium mb-1">Bozze</div>
                                    <div className="text-3xl font-bold text-warning">
                                        {activeCourses.filter(c => !c.published).length}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="glass border-border card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm font-medium mb-1">Iscrizioni</div>
                                    <div className="text-3xl font-bold text-primary">
                                        {activeCourses.reduce((acc, c) => acc + c._count.enrollments, 0)}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Courses Table */}
                {activeCourses.length === 0 && archivedCourses.length === 0 ? (
                    <Card className="glass border-border overflow-hidden">
                        <div className="p-12 text-center">
                            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-primary">Nessun corso</h3>
                            <p className="text-muted-foreground mb-6">Crea il tuo primo corso per iniziare</p>
                            <Link href="/admin/courses/create">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow">
                                    Crea il tuo primo corso
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* Published Courses */}
                        {activeCoursesWithDeadlines.filter(c => c.published).length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-green-500 rounded-full" />
                                    Corsi Pubblicati
                                    <span className="ml-2 px-3 py-1 bg-green-500/10 text-green-500 text-sm font-semibold rounded-full border border-green-500/30">
                                        {activeCoursesWithDeadlines.filter(c => c.published).length}
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeCoursesWithDeadlines.filter(c => c.published).map((course) => (
                                        <Card key={course.id} className="glass border-green-500/30 border-2 card-hover group relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded border border-green-500/30 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        PUBBLICATO
                                                    </span>
                                                    {course.expiredCount > 0 && (
                                                        <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-semibold rounded border border-red-500/30">
                                                            ❌ {course.expiredCount} scaduti
                                                        </span>
                                                    )}
                                                    {course.expiringCount > 0 && (
                                                        <span className="px-2 py-1 bg-orange-500/10 text-orange-500 text-xs font-semibold rounded border border-orange-500/30">
                                                            ⏰ {course.expiringCount} in scadenza
                                                        </span>
                                                    )}
                                                    <CourseActions
                                                        courseId={course.id}
                                                        courseTitle={course.title}
                                                        isArchived={false}
                                                        hasEnrollments={course._count.enrollments > 0}
                                                    />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                                                {course.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                                                )}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.modules} moduli</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.enrollments} iscritti</span>
                                                    </div>
                                                </div>
                                                <Link href={`/admin/courses/${course.id}`} className="w-full">
                                                    <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Modifica
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Draft Courses */}
                        {activeCoursesWithDeadlines.filter(c => !c.published).length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-orange-500 rounded-full" />
                                    Bozze
                                    <span className="ml-2 px-3 py-1 bg-orange-500/10 text-orange-500 text-sm font-semibold rounded-full border border-orange-500/30">
                                        {activeCoursesWithDeadlines.filter(c => !c.published).length}
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeCoursesWithDeadlines.filter(c => !c.published).map((course) => (
                                        <Card key={course.id} className="glass border-orange-500/30 border-2 card-hover group relative overflow-hidden opacity-80">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <span className="px-2 py-1 bg-orange-500/10 text-orange-500 text-xs font-semibold rounded border border-orange-500/30 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        BOZZA
                                                    </span>
                                                    <CourseActions
                                                        courseId={course.id}
                                                        courseTitle={course.title}
                                                        isArchived={false}
                                                        hasEnrollments={course._count.enrollments > 0}
                                                    />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                                                {course.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                                                )}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.modules} moduli</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.enrollments} iscritti</span>
                                                    </div>
                                                </div>
                                                <Link href={`/admin/courses/${course.id}`} className="w-full">
                                                    <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Modifica
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Archived Courses */}
                        {archivedCoursesWithData.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-gray-500 rounded-full" />
                                    Corsi Archiviati
                                    <span className="ml-2 px-3 py-1 bg-gray-500/10 text-gray-500 text-sm font-semibold rounded-full border border-gray-500/30">
                                        {archivedCoursesWithData.length}
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {archivedCoursesWithData.map((course) => (
                                        <Card key={course.id} className="glass border-gray-500/30 border-2 card-hover group relative overflow-hidden opacity-60">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-500 to-gray-400"></div>
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs font-semibold rounded border border-gray-500/30 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                        </svg>
                                                        ARCHIVIATO
                                                    </span>
                                                    <CourseActions
                                                        courseId={course.id}
                                                        courseTitle={course.title}
                                                        isArchived={true}
                                                        hasEnrollments={course._count.enrollments > 0}
                                                    />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                                                {course.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                                                )}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.modules} moduli</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                        <span className="text-sm">{course._count.enrollments} iscritti</span>
                                                    </div>
                                                </div>
                                                {course.archivedAt && (
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        Archiviato il {formatDateOnly(new Date(course.archivedAt))}
                                                    </p>
                                                )}
                                                <Link href={`/admin/courses/${course.id}`} className="w-full">
                                                    <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        Visualizza
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
