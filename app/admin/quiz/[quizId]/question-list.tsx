"use client"

import { Button } from "@/components/ui/button"
import { deleteQuestion } from "@/app/actions/quiz"
import { useState } from "react"
import type { JsonValue } from "@prisma/client/runtime/library"

type Question = {
    id: string
    question: string
    type: string
    explanation?: string | null
    options: JsonValue
    correctAnswer: number
    points: number
    position: number
}

export function QuestionList({ questions, quizId }: { questions: Question[], quizId: string }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const handleDelete = async (questionId: string) => {
        if (!confirm("Sei sicuro di voler eliminare questa domanda?")) return

        setIsDeleting(questionId)
        await deleteQuestion(questionId, quizId)
        setIsDeleting(null)
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 gradient-text">Nessuna domanda</h3>
                <p className="text-gray-400 text-sm">Aggiungi la prima domanda per iniziare</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {questions.map((question, index) => {
                const options = Array.isArray(question.options) ? question.options as string[] : []

                return (
                    <div key={question.id} className="bg-card border border-border rounded-xl p-6 hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-sm">{index + 1}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${question.type === 'TRUE_FALSE'
                                            ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400'
                                            : 'bg-primary/10 border-primary/20 text-primary'
                                            }`}>
                                            {question.type === 'TRUE_FALSE' ? 'Vero/Falso' : 'Scelta Multipla'}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold mb-3 text-foreground">{question.question}</h4>

                                    {question.explanation && (
                                        <div className="mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-muted-foreground dark:bg-blue-500/5 dark:border-blue-500/10 dark:text-gray-400">
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold mr-2">Spiegazione:</span>
                                            {question.explanation}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {question.type === 'TRUE_FALSE' ? (
                                            // True/False Options
                                            ['Vero', 'Falso'].map((option, optIndex) => (
                                                <div
                                                    key={optIndex}
                                                    className={`p-3 rounded-lg text-sm ${optIndex === question.correctAnswer
                                                        ? 'bg-green-100 border border-green-200 text-green-700 dark:bg-green-500/20 dark:border-green-500/30 dark:text-green-400'
                                                        : 'bg-secondary/50 border border-border opacity-70'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {optIndex === question.correctAnswer && (
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        <span>{option}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            // Multiple Choice Options
                                            options.map((option: string, optIndex: number) => (
                                                <div
                                                    key={optIndex}
                                                    className={`p-3 rounded-lg text-sm ${optIndex === question.correctAnswer
                                                        ? 'bg-green-100 border border-green-200 text-green-700 dark:bg-green-500/20 dark:border-green-500/30 dark:text-green-400'
                                                        : 'bg-secondary/50 border border-border'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {optIndex === question.correctAnswer && (
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        <span>{option}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-3 text-xs text-muted-foreground">
                                        Punti: {question.points}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(question.id)}
                                disabled={isDeleting === question.id}
                                className="hover:bg-destructive/10 hover:text-destructive"
                            >
                                {isDeleting === question.id ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
