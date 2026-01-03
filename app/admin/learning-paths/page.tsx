import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, BookOpen } from "lucide-react"

export default async function AdminLearningPathsPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/login")

    const paths = await db.learningPath.findMany({
        include: {
            courses: {
                include: {
                    course: true
                },
                orderBy: {
                    order: 'asc'
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Gestione Percorsi
                        </h1>
                        <p className="text-muted-foreground">Crea e gestisci i percorsi di apprendimento</p>
                    </div>
                    <Link href="/admin/learning-paths/create">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo Percorso
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paths.map((path) => (
                        <Card key={path.id} className="border-border hover:shadow-md transition-all">
                            <CardHeader>
                                <CardTitle className="text-xl text-foreground">
                                    {path.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                    {path.description || "Nessuna descrizione"}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <BookOpen className="w-4 h-4" />
                                    {path.courses.length} Corsi inclusi
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/admin/learning-paths/${path.id}`} className="w-full">
                                        <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                                            Gestisci
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
