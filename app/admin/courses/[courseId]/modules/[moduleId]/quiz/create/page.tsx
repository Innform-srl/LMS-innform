import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CreateQuizForm } from "./create-quiz-form"

export default async function CreateQuizPage({
    params
}: {
    params: Promise<{ courseId: string, moduleId: string }>
}) {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const { courseId, moduleId } = await params

    const courseModule = await db.module.findUnique({
        where: { id: moduleId },
        include: {
            course: true,
            quiz: true
        }
    })

    if (!courseModule) {
        return <div className="p-8">Modulo non trovato</div>
    }

    if (courseModule.quiz) {
        redirect(`/admin/quiz/${courseModule.quiz.id}`)
    }

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                <Link
                    href={`/admin/courses/${courseId}`}
                    className="text-sm text-gray-400 hover:text-gray-300 mb-4 block"
                >
                    ← Torna al corso
                </Link>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl text-foreground">
                            <span className="text-primary">Crea Quiz</span> per {courseModule.title}
                        </CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">
                            Corso: {courseModule.course.title}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <CreateQuizForm courseId={courseId} moduleId={moduleId} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
