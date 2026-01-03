import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UpcomingDeadlinesCard } from "@/components/deadline-badge"
import { Webhook, BarChart3 } from "lucide-react"

export default async function AdminPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const [totalCourses, publishedCourses, totalEnrollments, totalUsers] = await Promise.all([
        db.course.count(),
        db.course.count({ where: { published: true } }),
        db.enrollment.count(),
        db.user.count()
    ])

    const recentEnrollments = await db.enrollment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } }
        }
    })

    const completionRate = totalEnrollments > 0
        ? await db.enrollment.count({ where: { completed: true } }) / totalEnrollments * 100
        : 0

    // Get upcoming deadlines (next 7 days)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    const upcomingDeadlines = await db.enrollment.findMany({
        where: {
            completed: false,
            dueDate: {
                lte: futureDate,
                gte: new Date()
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            course: {
                select: {
                    id: true,
                    title: true
                }
            }
        },
        orderBy: {
            dueDate: 'asc'
        }
    })

    // Group by course
    const expiringCoursesMap = new Map<string, {
        courseId: string,
        courseTitle: string,
        count: number,
        nextDeadline: Date
    }>()

    upcomingDeadlines.forEach(enrollment => {
        if (!enrollment.dueDate) return

        const existing = expiringCoursesMap.get(enrollment.courseId)
        if (existing) {
            existing.count++
            if (enrollment.dueDate < existing.nextDeadline) {
                existing.nextDeadline = enrollment.dueDate
            }
        } else {
            expiringCoursesMap.set(enrollment.courseId, {
                courseId: enrollment.courseId,
                courseTitle: enrollment.course.title,
                count: 1,
                nextDeadline: enrollment.dueDate
            })
        }
    })

    const expiringCourses = Array.from(expiringCoursesMap.values())
        .sort((a, b) => a.nextDeadline.getTime() - b.nextDeadline.getTime())
        .slice(0, 5)

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                <span className="text-primary">Dashboard Admin</span>
                            </h1>
                            <p className="text-muted-foreground">Gestisci corsi, utenti e monitora i progressi</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/admin/enrollments">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Panoramica Iscrizioni
                                </Button>
                            </Link>
                            <Link href="/admin/courses">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Nuovo Corso
                                </Button>
                            </Link>
                            <Link href="/admin/analytics">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Analytics
                                </Button>
                            </Link>
                            <Link href="/admin/reports/time-tracking">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Time Tracking
                                </Button>
                            </Link>
                            <Link href="/admin/reports/engagement">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Report Engagement
                                </Button>
                            </Link>
                            <Link href="/admin/integrations">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    <Webhook className="w-4 h-4 mr-2" />
                                    Integrazioni TMS
                                </Button>
                            </Link>
                            <Link href="/">
                                <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                    Dashboard Utente
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="glass border-border card-hover">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardDescription className="text-muted-foreground">Totale Corsi</CardDescription>
                                        <CardTitle className="text-4xl font-bold text-primary">{totalCourses}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{publishedCourses} pubblicati</p>
                                    </div>
                                    <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/10">
                                        <svg className="w-7 h-7 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="glass border-border card-hover">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardDescription className="text-muted-foreground">Iscrizioni</CardDescription>
                                        <CardTitle className="text-4xl font-bold text-primary">{totalEnrollments}</CardTitle>
                                    </div>
                                    <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/10">
                                        <svg className="w-7 h-7 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="glass border-border card-hover">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardDescription className="text-muted-foreground">Utenti</CardDescription>
                                        <CardTitle className="text-4xl font-bold text-primary">{totalUsers}</CardTitle>
                                    </div>
                                    <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/10">
                                        <svg className="w-7 h-7 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="glass border-border card-hover">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardDescription className="text-muted-foreground">Tasso Completamento</CardDescription>
                                        <CardTitle className="text-4xl font-bold text-primary">{Math.round(completionRate)}%</CardTitle>
                                    </div>
                                    <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/10">
                                        <svg className="w-7 h-7 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Deadlines Widget */}
                    {expiringCourses.length > 0 && (
                        <UpcomingDeadlinesCard courses={expiringCourses} />
                    )}

                    {/* Recent Enrollments */}
                    <Card className="glass border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="w-1 h-6 bg-secondary rounded-full" />
                                Iscrizioni Recenti
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentEnrollments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nessuna iscrizione recente</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentEnrollments.map((enrollment) => (
                                        <div key={enrollment.id} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:bg-accent/10 transition-colors">
                                            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-secondary-foreground font-semibold text-sm">
                                                    {enrollment.user.name?.[0] || enrollment.user.email[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{enrollment.user.name || enrollment.user.email}</div>
                                                <div className="text-xs text-muted-foreground truncate">{enrollment.course.title}</div>
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
