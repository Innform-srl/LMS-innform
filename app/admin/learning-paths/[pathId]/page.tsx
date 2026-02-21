import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addCourseToPath, removeCourseFromPath, deleteLearningPath } from "@/app/actions/learning-paths"

export default async function ManageLearningPathPage({
    params
}: {
    params: Promise<{ pathId: string }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/login")

    const { pathId } = await params

    const path = await db.learningPath.findUnique({
        where: { id: pathId },
        include: {
            courses: {
                include: {
                    course: true
                },
                orderBy: {
                    order: 'asc'
                }
            }
        }
    })

    if (!path) return <div>Percorso non trovato</div>

    const allCourses = await db.course.findMany({
        where: {
            published: true,
            NOT: {
                id: {
                    in: path.courses.map((c: { courseId: string }) => c.courseId)
                }
            }
        }
    })

    const deletePathWithId = deleteLearningPath.bind(null, path.id)

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/admin/learning-paths"
                    className="text-sm text-muted-foreground hover:text-foreground mb-4 block"
                >
                    ← Torna ai percorsi
                </Link>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-foreground">
                            {path.title}
                        </h1>
                        <p className="text-muted-foreground">{path.description}</p>
                    </div>
                    <form action={async () => {
                        "use server"
                        await deletePathWithId()
                    }}>
                        <Button variant="destructive" type="submit">
                            Elimina Percorso
                        </Button>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Included Courses */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Corsi Inclusi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {path.courses.map((item: { id: string; course: { id: string; title: string } }, index: number) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {index + 1}
                                            </div>
                                            <span className="font-medium">{item.course.title}</span>
                                        </div>
                                        <form action={async () => {
                                            "use server"
                                            await removeCourseFromPath(path.id, item.course.id)
                                        }}>
                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </Button>
                                        </form>
                                    </div>
                                ))}
                                {path.courses.length === 0 && (
                                    <p className="text-muted-foreground text-sm italic">Nessun corso in questo percorso</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Available Courses */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Aggiungi Corsi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {allCourses.map((course) => (
                                    <div key={course.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                                        <span className="text-sm font-medium">{course.title}</span>
                                        <form action={async () => {
                                            "use server"
                                            await addCourseToPath(path.id, course.id)
                                        }}>
                                            <Button size="sm" variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                                                Aggiungi
                                            </Button>
                                        </form>
                                    </div>
                                ))}
                                {allCourses.length === 0 && (
                                    <p className="text-muted-foreground text-sm italic">Nessun altro corso disponibile</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
