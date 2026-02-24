import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ModuleList } from "./module-list"
import { toggleCoursePublished } from "@/app/actions/modules"
import { DeadlineSettings } from "./deadline-settings"
import { Card } from "@/components/ui/card"
import { CourseAssignments } from "./course-assignments"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { ImportModuleDialog } from "./import-module-dialog"

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const { courseId } = await params

    const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                orderBy: { position: "asc" },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            _count: {
                                select: { questions: true }
                            }
                        }
                    },
                    liveSession: true
                }
            },
            _count: {
                select: { enrollments: true }
            }
        }
    })

    if (!course) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Corso non trovato</h1>
                    <Link href="/admin/courses">
                        <Button variant="outline" className="border-border hover:bg-accent">
                            ← Torna ai corsi
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/courses"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Torna ai corsi
                    </Link>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                <span className="text-primary">{course.title}</span>
                            </h1>
                            {course.description && (
                                <p className="text-muted-foreground text-lg">{course.description}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <form action={async () => {
                                "use server"
                                await toggleCoursePublished(course.id)
                            }}>
                                <Button
                                    variant={course.published ? "outline" : "default"}
                                    className={course.published
                                        ? "border-border hover:bg-accent"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }
                                    type="submit"
                                >
                                    {course.published ? (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                            Nascondi
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Pubblica
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-card border-border p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-muted-foreground text-sm font-medium">Moduli</div>
                                <div className="text-3xl font-bold text-foreground">{course.modules.length}</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-card border-border p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-muted-foreground text-sm font-medium">Iscritti</div>
                                <div className="text-3xl font-bold text-primary">{course._count.enrollments}</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-card border-border p-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${course.published
                                ? 'bg-green-500/10'
                                : 'bg-yellow-500/10'
                                }`}>
                                {course.published ? (
                                    <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <div className="text-muted-foreground text-sm font-medium">Stato</div>
                                <div className={`text-xl font-bold ${course.published ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {course.published ? "Pubblicato" : "Bozza"}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Deadline Settings */}
                <div className="mb-8">
                    <CollapsibleSection title="Impostazioni Corso">
                        <DeadlineSettings
                            courseId={course.id}
                            initialIsRequired={course.isRequired}
                            initialDueInDays={course.dueInDays}
                            initialMinimumDuration={course.minimumDuration}
                        />
                    </CollapsibleSection>
                </div>

                {/* Assignments Section */}
                <div className="mb-8">
                    <CourseAssignments
                        courseId={course.id}
                        initialCompanyId={course.companyId}
                        initialDepartmentId={course.departmentId}
                    />
                </div>

                {/* Modules Section */}
                <Card className="bg-card border-border p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-6 bg-primary rounded-full" />
                            <h2 className="text-2xl font-bold">Moduli del Corso</h2>
                        </div>
                        <div className="flex gap-2">
                            <ImportModuleDialog courseId={course.id} />
                            <Link href={`/admin/courses/${course.id}/modules/create`}>
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Aggiungi Modulo
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {course.modules.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">Nessun modulo presente</h3>
                            <p className="text-muted-foreground mb-6">Inizia aggiungendo il primo modulo al corso</p>
                            <Link href={`/admin/courses/${course.id}/modules/create`}>
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    Crea Primo Modulo
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ModuleList modules={course.modules} courseId={course.id} />
                    )}
                </Card>
            </div>
        </div>
    )
}
