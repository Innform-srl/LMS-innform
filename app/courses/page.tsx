import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CourseCard } from "@/components/course-card"


import { CourseSearch } from "@/components/course-search"

export default async function CourseCatalogPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const params = await searchParams
    const query = params.query || ""

    const courses = await db.course.findMany({
        where: {
            published: true,
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ],
            // Only show courses the user is enrolled in
            // enrollments: {
            //     some: {
            //         userId: session.user.id
            //     }
            // }
        },
        include: {
            modules: {
                where: effectivelyPublishedModuleWhere(),
                select: { id: true }
            },
            enrollments: {
                where: { userId: session.user.id },
                select: { id: true, progress: true, completed: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                <span className="text-primary">Catalogo</span> Corsi
                            </h1>
                            <p className="text-gray-400">Esplora i corsi disponibili e inizia il tuo percorso di apprendimento</p>
                        </div>
                        <Link href="/">
                            <Button variant="outline" className="border-border hover:bg-accent">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Torna alla Dashboard
                            </Button>
                        </Link>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-8">
                        <CourseSearch />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass border-border">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardDescription className="text-muted-foreground">Corsi Disponibili</CardDescription>
                                        <CardTitle className="text-2xl text-foreground">{courses.length}</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="glass border-border">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardDescription className="text-muted-foreground">Iscrizioni Attive</CardDescription>
                                        <CardTitle className="text-2xl text-foreground">
                                            {courses.filter(c => c.enrollments.length > 0).length}
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="glass border-border">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardDescription className="text-muted-foreground">Completati</CardDescription>
                                        <CardTitle className="text-2xl text-foreground">
                                            {courses.filter(c => c.enrollments[0]?.completed).length}
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>
                </div>

                {/* Courses Grid */}
                {courses.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-foreground">Nessun corso disponibile</h3>
                        <p className="text-muted-foreground">I corsi verranno pubblicati a breve.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => {
                            const enrollment = course.enrollments[0]

                            return (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    progress={enrollment ? {
                                        progress: enrollment.progress,
                                        completed: enrollment.completed
                                    } : null}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div >
    )
}
