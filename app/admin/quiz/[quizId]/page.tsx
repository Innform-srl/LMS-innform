import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuestionList } from "./question-list"
import { AddQuestionForm } from "./add-question-form"

export default async function QuizManagementPage({ params }: { params: Promise<{ quizId: string }> }) {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const { quizId } = await params

    const quiz = await db.quiz.findUnique({
        where: { id: quizId },
        include: {
            module: {
                include: {
                    course: true
                }
            },
            questions: {
                orderBy: { position: "asc" }
            },
            _count: {
                select: { attempts: true }
            }
        }
    })

    if (!quiz) {
        return <div className="p-8">Quiz non trovato</div>
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="mb-12">
                <Link
                    href={`/admin/courses/${quiz.module.courseId}`}
                    className="text-sm text-gray-400 hover:text-gray-300 mb-4 block"
                >
                    ← Torna al corso
                </Link>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">
                            <span className="gradient-text">Quiz:</span> {quiz.title}
                        </h1>
                        <p className="text-gray-400">{quiz.module.course.title} → {quiz.module.title}</p>
                        {quiz.description && (
                            <p className="text-gray-500 mt-2">{quiz.description}</p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <CardDescription>Domande</CardDescription>
                                    <CardTitle className="text-2xl">{quiz.questions.length}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <CardDescription>Punteggio Min.</CardDescription>
                                    <CardTitle className="text-2xl text-green-600 dark:text-green-400">{quiz.passingScore}%</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <CardDescription>Tempo Limite</CardDescription>
                                    <CardTitle className="text-2xl text-blue-600 dark:text-blue-400">
                                        {quiz.timeLimit ? `${quiz.timeLimit} min` : "Illimitato"}
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <CardDescription>Tentativi</CardDescription>
                                    <CardTitle className="text-2xl text-orange-600 dark:text-orange-400">{quiz._count.attempts}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Questions List */}
                <div className="lg:col-span-2">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="w-1 h-6 bg-primary rounded-full" />
                                Domande del Quiz
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <QuestionList questions={quiz.questions} quizId={quiz.id} />
                        </CardContent>
                    </Card>
                </div>

                {/* Add Question Form */}
                <div>
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full" />
                                Aggiungi Domanda
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AddQuestionForm quizId={quiz.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
