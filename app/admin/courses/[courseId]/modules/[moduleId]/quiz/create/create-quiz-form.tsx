"use client"

import { createQuiz } from "@/app/actions/quiz"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AiQuizGenerator } from "./ai-generator"
import { useState } from "react"
import Link from "next/link"

interface CreateQuizFormProps {
    courseId: string
    moduleId: string
}

export function CreateQuizForm({ courseId, moduleId }: CreateQuizFormProps) {
    const [generatedQuestions, setGeneratedQuestions] = useState<{ question: string; options: string[]; correctAnswer: number }[]>([])

    // We need to wrap the server action to handle the generated questions
    // Since createQuiz expects FormData, we'll append the questions as a hidden field JSON

    return (
        <div className="space-y-6">
            <AiQuizGenerator onQuestionsGenerated={setGeneratedQuestions} />

            <form action={createQuiz.bind(null, moduleId)} className="space-y-6">
                {/* Hidden field to pass generated questions to the server action */}
                {generatedQuestions.length > 0 && (
                    <input
                        type="hidden"
                        name="aiQuestions"
                        value={JSON.stringify(generatedQuestions)}
                    />
                )}

                <div className="space-y-2">
                    <Label htmlFor="title">Titolo Quiz *</Label>
                    <Input
                        id="title"
                        name="title"
                        placeholder="Es: Quiz Finale - Modulo 1"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <textarea
                        id="description"
                        name="description"
                        placeholder="Descrizione del quiz..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="passingScore">Punteggio Minimo (%)</Label>
                        <Input
                            id="passingScore"
                            name="passingScore"
                            type="number"
                            min="0"
                            max="100"
                            defaultValue="70"
                        />
                        <p className="text-xs text-muted-foreground">Default: 70%</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timeLimit">Tempo Limite (min)</Label>
                        <Input
                            id="timeLimit"
                            name="timeLimit"
                            type="number"
                            min="1"
                            placeholder="Opzionale"
                        />
                        <p className="text-xs text-muted-foreground">Lascia vuoto per illimitato</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxAttempts">Tentativi Massimi</Label>
                        <Input
                            id="maxAttempts"
                            name="maxAttempts"
                            type="number"
                            min="1"
                            defaultValue="3"
                        />
                        <p className="text-xs text-muted-foreground">Default: 3</p>
                    </div>
                </div>

                {generatedQuestions.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold">Domande AI pronte!</span>
                        </div>
                        <p className="text-sm text-green-600">
                            Verranno create automaticamente {generatedQuestions.length} domande al salvataggio del quiz.
                        </p>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <Button
                        type="submit"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 btn-glow text-white"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Crea Quiz
                    </Button>
                    <Link href={`/admin/courses/${courseId}`}>
                        <Button variant="outline" type="button">
                            Annulla
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
