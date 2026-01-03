import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function QuizResultsPage({
    params
}: {
    params: Promise<{ quizId: string, attemptId: string }>
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const { attemptId } = await params

    const attempt = await db.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
            quiz: {
                include: {
                    questions: {
                        orderBy: { position: "asc" },
                        select: {
                            id: true,
                            question: true,
                            type: true,
                            explanation: true,
                            options: true,
                            position: true,
                            points: true,
                            correctAnswer: true
                        }
                    },
                    module: {
                        include: {
                            course: true
                        }
                    }
                }
            },
            answers: true,
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    })

    if (!attempt || attempt.userId !== session.user.id) {
        return <div className="p-8">Risultati non trovati</div>
    }

    const totalQuestions = attempt.quiz.questions.length
    const correctAnswers = attempt.answers.filter(a => a.isCorrect).length

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-12 text-center">
                    <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${attempt.passed
                        ? 'bg-green-500/20 pulse-glow'
                        : 'bg-destructive/20'
                        }`}>
                        {attempt.passed ? (
                            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-16 h-16 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </div>

                    <h1 className="text-4xl font-bold mb-2">
                        {attempt.passed ? (
                            <span className="text-green-500">Quiz Superato! 🎉</span>
                        ) : (
                            <span className="text-destructive">Quiz Non Superato</span>
                        )}
                    </h1>
                    <p className="text-muted-foreground">{attempt.quiz.title}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm">Punteggio</div>
                                    <div className="text-3xl font-bold text-primary">{attempt.score}%</div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm">Corrette</div>
                                    <div className="text-3xl font-bold text-green-500">{correctAnswers}</div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm">Sbagliate</div>
                                    <div className="text-3xl font-bold text-destructive">{totalQuestions - correctAnswers}</div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-sm">Richiesto</div>
                                    <div className="text-3xl font-bold text-secondary-foreground">{attempt.quiz.passingScore}%</div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 mb-12">
                    <Link href={`/courses/${attempt.quiz.module.courseId}`}>
                        <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Torna al Corso
                        </Button>
                    </Link>

                    {attempt.passed && (
                        <Link href={`/api/certificate/${attempt.id}`} target="_blank">
                            <Button className="bg-green-600 text-white hover:bg-green-700 btn-glow">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Scarica Certificato
                            </Button>
                        </Link>
                    )}

                    {!attempt.passed && (
                        <Link href={`/quiz/${attempt.quiz.id}`}>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Riprova Quiz
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Review Answers */}
                <Card className="glass border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="w-1 h-6 bg-primary rounded-full" />
                            Revisione Risposte
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {attempt.quiz.questions.map((question) => {
                                const answer = attempt.answers.find(a => a.questionId === question.id)
                                let options: string[] = []
                                if (question.type === 'TRUE_FALSE') {
                                    options = ["Vero", "Falso"]
                                } else {
                                    options = Array.isArray(question.options) ? question.options as string[] : []
                                }

                                return (
                                    <div key={question.id} className="glass border-border rounded-xl p-6">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${answer?.isCorrect
                                                ? 'bg-green-500/20'
                                                : 'bg-destructive/20'
                                                }`}>
                                                {answer?.isCorrect ? (
                                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-foreground">{question.question}</h4>
                                                {question.explanation && (
                                                    <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
                                                        <span className="font-bold mr-1 text-foreground">Spiegazione:</span>
                                                        {question.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 ml-11">
                                            {options.map((option, optIndex) => {
                                                const isCorrect = optIndex === question.correctAnswer
                                                const isSelected = answer?.selectedOption === optIndex

                                                return (
                                                    <div
                                                        key={optIndex}
                                                        className={`p-3 rounded-lg text-sm ${isCorrect
                                                            ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400'
                                                            : isSelected
                                                                ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                                                                : 'bg-card/50 border border-border text-muted-foreground'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isCorrect && (
                                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                            {isSelected && !isCorrect && (
                                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                            <span>{String(option)}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
