import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CourseCardProps {
    course: {
        id: string
        title: string
        description: string | null
        modules?: { id: string }[] // Optional modules array
        _count?: {
            modules: number
        }
    }
    progress?: {
        progress: number
        completed: boolean
    } | null
}

export function CourseCard({ course, progress }: CourseCardProps) {
    const moduleCount = course._count?.modules ?? course.modules?.length ?? 0

    return (
        <Card className="glass border-border card-hover group overflow-hidden h-full flex flex-col">
            <div className="h-2 bg-primary" />
            <CardHeader>
                <CardTitle className="text-xl transition-all">{course.title}</CardTitle>
                <CardDescription className="text-muted-foreground line-clamp-2 min-h-[40px]">
                    {course.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span>{moduleCount} moduli</span>
                        </div>
                    </div>

                    {progress ? (
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-semibold text-primary">{Math.round(progress.progress)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${progress.progress}%` }}
                                    />
                                </div>
                            </div>
                            <Link href={`/courses/${course.id}`}>
                                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                    {progress.completed ? "Rivedi Corso" : "Continua →"}
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Non iscritto</span>
                            </div>
                            <Link href={`/courses/${course.id}`}>
                                <Button variant="outline" className="w-full">
                                    Vedi Dettagli
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
