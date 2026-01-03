import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"

export default async function LearningPathsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const learningPaths = await db.learningPath.findMany({
        include: {
            courses: {
                include: {
                    course: true
                },
                orderBy: { order: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="text-primary">Percorsi di Apprendimento</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Segui percorsi strutturati per acquisire competenze complete.
                    </p>
                </div>

                {learningPaths.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-xl border border-border">
                        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground">Nessun percorso disponibile</h3>
                        <p className="text-muted-foreground mt-2">I percorsi verranno aggiunti presto.</p>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {learningPaths.map((path) => (
                            <Card key={path.id} className="glass border-border overflow-hidden">
                                <div className="h-2 bg-primary" />
                                <CardHeader>
                                    <CardTitle className="text-2xl">{path.title}</CardTitle>
                                    <CardDescription className="text-base">{path.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                            Corsi inclusi nel percorso:
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {path.courses.map((item, index) => (
                                                <div key={item.id} className="bg-muted/50 p-4 rounded-lg border border-border flex items-start gap-3 relative overflow-hidden group hover:bg-muted transition-colors">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                            {item.course.title}
                                                        </h5>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                            {item.course.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-4 flex justify-end">
                                            <Link href={`/courses/${path.courses[0]?.courseId}`}>
                                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                                    Inizia Percorso <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
