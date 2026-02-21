import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignCourseForm } from "./assign-course-form"

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const { userId } = await params

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            department: true,
            company: true,
            enrollments: {
                include: {
                    course: true
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Utente non trovato</h1>
                    <Link href="/admin/users">
                        <Button variant="outline">Torna alla lista</Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Fetch all published courses
    const allCourses = await db.course.findMany({
        where: { published: true },
        select: { id: true, title: true },
        orderBy: { title: 'asc' }
    })

    // Filter out courses the user is already enrolled in
    const enrolledCourseIds = new Set(user.enrollments.map(e => e.courseId))
    const availableCourses = allCourses.filter(c => !enrolledCourseIds.has(c.id))

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Torna agli utenti
                    </Link>
                    <h1 className="text-4xl font-bold mb-2 text-primary">{user.name || user.email}</h1>
                    <div className="flex gap-2 text-muted-foreground">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span className="capitalize">{user.role === 'TEACHER' ? 'Docente' : user.role === 'ADMIN' ? 'Amministratore' : 'Dipendente'}</span>
                        {user.department && (
                            <>
                                <span>•</span>
                                <span>{user.department.name}</span>
                            </>
                        )}
                        {user.company && (
                            <>
                                <span>•</span>
                                <span>{user.company.name}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Stats Card (Placeholder for now) */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Statistiche Rapide</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-background/50 border border-border">
                                <div className="text-2xl font-bold text-primary">{user.enrollments.length}</div>
                                <div className="text-sm text-muted-foreground">Corsi Assegnati</div>
                            </div>
                            <div className="p-4 rounded-lg bg-background/50 border border-border">
                                <div className="text-2xl font-bold text-green-500">
                                    {user.enrollments.filter(e => e.completed).length}
                                </div>
                                <div className="text-sm text-muted-foreground">Corsi Completati</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignment Card */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Assegna Corso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AssignCourseForm userId={user.id} courses={availableCourses} />
                    </CardContent>
                </Card>
            </div>

            {/* Enrollments List */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Iscrizioni Attive</CardTitle>
                </CardHeader>
                <CardContent>
                    {user.enrollments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nessun corso assegnato a questo utente.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {user.enrollments.map((enrollment) => {
                                // Determine status: COMPLETATO, IN CORSO, or SOSPESO
                                const isCompleted = enrollment.completed
                                const hasProgress = enrollment.progress > 0
                                const isSuspended = !isCompleted && hasProgress && enrollment.progress < 100
                                const isActive = !isCompleted && !isSuspended

                                let statusBadge
                                let statusColor
                                let borderColor

                                if (isCompleted) {
                                    statusBadge = { icon: "✓", text: "COMPLETATO", bg: "bg-green-500/10", textColor: "text-green-500", border: "border-green-500/30" }
                                    statusColor = "bg-green-500"
                                    borderColor = "border-green-500/30"
                                } else if (isSuspended) {
                                    statusBadge = { icon: "⏸", text: "SOSPESO", bg: "bg-orange-500/10", textColor: "text-orange-500", border: "border-orange-500/30" }
                                    statusColor = "bg-orange-500"
                                    borderColor = "border-orange-500/30"
                                } else {
                                    statusBadge = { icon: "▶", text: "IN CORSO", bg: "bg-blue-500/10", textColor: "text-blue-500", border: "border-blue-500/30" }
                                    statusColor = "bg-blue-500"
                                    borderColor = "border-blue-500/30"
                                }

                                return (
                                    <div
                                        key={enrollment.id}
                                        className={`flex items-center justify-between p-4 rounded-lg bg-background/50 border-2 ${borderColor} hover:shadow-md transition-all`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-foreground">{enrollment.course.title}</h3>
                                                    <span className={`px-2 py-1 ${statusBadge.bg} ${statusBadge.textColor} text-xs font-semibold rounded border ${statusBadge.border} flex items-center gap-1`}>
                                                        <span>{statusBadge.icon}</span>
                                                        {statusBadge.text}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Assegnato il {new Date(enrollment.createdAt).toLocaleDateString()}
                                                    {enrollment.completedAt && ` • Completato il ${new Date(enrollment.completedAt).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-foreground">
                                                    {Math.round(enrollment.progress)}%
                                                </div>
                                                <div className="w-32 h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${statusColor}`}
                                                        style={{ width: `${enrollment.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
