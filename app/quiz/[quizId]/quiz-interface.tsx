"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { submitQuizAttempt } from "@/app/actions/quiz-attempt"
import { useRouter } from "next/navigation"
import { trackModuleTime, getVideoProgress } from "@/app/actions/video-progress"
import type { JsonValue } from "@prisma/client/runtime/library"

type Question = {
    id: string
    question: string
    type: string
    explanation: string | null
    options: JsonValue
    position: number
    points: number
}

type Quiz = {
    id: string
    title: string
    description: string | null
    passingScore: number
    timeLimit: number | null
    questions: Question[]
}

type Enrollment = {
    id: string
    progress: number
    completed: boolean
    timeSpent: number
}

export function QuizInterface({
    quiz,
    courseId: _courseId,
    attempts,
    maxAttempts,
    enrollment,
    moduleId,
    moduleTitle,
    courseTitle,
    courseMinDuration,
    moduleMinDuration
}: {
    quiz: Quiz
    courseId: string
    attempts: number
    maxAttempts: number
    enrollment: Enrollment
    moduleId: string
    moduleTitle: string
    courseTitle: string
    courseMinDuration: number
    moduleMinDuration: number | null
}) {
    const router = useRouter()
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string | number | number[]>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(
        quiz.timeLimit ? quiz.timeLimit * 60 : null
    )
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Time tracking state
    const [localTimeSpent, setLocalTimeSpent] = useState(enrollment.timeSpent)
    const [moduleTimeSpent, setModuleTimeSpent] = useState(0)
    const [isTrackingModule, setIsTrackingModule] = useState(false)

    // Load initial module progress
    useEffect(() => {
        const loadModuleProgress = async () => {
            setIsTrackingModule(false)
            const progress = await getVideoProgress(moduleId)
            if (progress) {
                setModuleTimeSpent(progress.watchedSeconds)
            } else {
                setModuleTimeSpent(0)
            }
            setIsTrackingModule(true)
        }
        loadModuleProgress()
    }, [moduleId])

    // Track time
    const unsavedSecondsRef = useRef(0)

    useEffect(() => {
        if (!isTrackingModule) return

        const interval = setInterval(() => {
            if (document.hidden) return

            // Update module time
            setModuleTimeSpent(prev => {
                const newTime = prev + 5
                unsavedSecondsRef.current += 5

                // Save every 30 seconds
                if (unsavedSecondsRef.current >= 30) {
                    trackModuleTime(moduleId, unsavedSecondsRef.current)
                    unsavedSecondsRef.current = 0
                }
                return newTime
            })

            // Update course time
            setLocalTimeSpent(prev => prev + 5)
        }, 5000)

        return () => {
            clearInterval(interval)
            if (unsavedSecondsRef.current > 0) {
                trackModuleTime(moduleId, unsavedSecondsRef.current)
                unsavedSecondsRef.current = 0
            }
        }
    }, [moduleId, isTrackingModule])

    useEffect(() => {
        if (timeLeft === null) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 0) {
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft])

    const handleAnswer = (questionId: string, value: string | number) => {
        const currentQ = quiz.questions.find(q => q.id === questionId)
        if (!currentQ) return

        if (currentQ.type === 'MULTI_SELECT') {
            setAnswers(prev => {
                const currentSelected = (prev[questionId] as number[]) || []
                const optionIndex = value as number

                if (currentSelected.includes(optionIndex)) {
                    return { ...prev, [questionId]: currentSelected.filter(i => i !== optionIndex) }
                } else {
                    return { ...prev, [questionId]: [...currentSelected, optionIndex] }
                }
            })
        } else {
            setAnswers(prev => ({ ...prev, [questionId]: value }))
        }
    }

    const handleSubmit = async () => {
        if (isSubmitting) return

        if (Object.keys(answers).length < quiz.questions.length) {
            if (!confirm("Non hai risposto a tutte le domande. Vuoi inviare comunque?")) {
                return
            }
        }

        setIsSubmitting(true)

        // Save any pending time before submitting
        if (unsavedSecondsRef.current > 0) {
            await trackModuleTime(moduleId, unsavedSecondsRef.current)
            unsavedSecondsRef.current = 0
        }

        const result = await submitQuizAttempt(quiz.id, answers)

        if (result.success && result.attemptId) {
            router.push(`/quiz/${quiz.id}/results/${result.attemptId}`)
        } else {
            alert(result.message || "Errore durante l'invio")
            setIsSubmitting(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Helper per formattare il tempo del modulo (copiato da CoursePlayer)
    const formatModuleTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}m ${s}s`
    }

    const currentQ = quiz.questions[currentQuestion]

    let options: string[] = []
    if (currentQ.type === 'TRUE_FALSE') {
        options = ["Vero", "Falso"]
    } else {
        options = Array.isArray(currentQ.options) ? currentQ.options as string[] : []
    }

    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

    // Time calculations
    const timeProgress = courseMinDuration > 0
        ? Math.min((localTimeSpent / courseMinDuration) * 100, 100)
        : 100
    const _timeHours = Math.floor(localTimeSpent / 60)
    const _timeMinutes = localTimeSpent % 60
    const _requiredHours = Math.floor(courseMinDuration / 60)
    const _requiredMinutes = courseMinDuration % 60

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <span>{courseTitle}</span>
                                <span>•</span>
                                <span>{moduleTitle}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">{quiz.title}</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Course Time Card */}
                            {courseMinDuration > 0 && (
                                <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-border">
                                    <div className={`p-2 rounded-lg ${timeProgress >= 100 ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-end mb-1 gap-4">
                                            <span className="text-xs text-muted-foreground">Tempo Totale</span>
                                            <span className={`text-xs font-mono font-bold ${timeProgress >= 100 ? 'text-green-400' : 'text-foreground'}`}>
                                                {Math.round(timeProgress)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1 w-32">
                                            <div
                                                className={`h-full transition-all duration-500 ${timeProgress >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                style={{ width: `${timeProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Module Time Card */}
                            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-border min-w-[200px]">
                                <div className={`p-2 rounded-lg ${moduleMinDuration && moduleMinDuration > 0 && moduleTimeSpent >= (moduleMinDuration * 60)
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-primary/20 text-primary'
                                    }`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs text-muted-foreground">Tempo Lezione</span>
                                        <span className={`text-xs font-mono font-bold ${moduleMinDuration && moduleMinDuration > 0 && moduleTimeSpent >= (moduleMinDuration * 60)
                                            ? 'text-green-400'
                                            : 'text-foreground'
                                            }`}>
                                            {formatModuleTime(moduleTimeSpent)}
                                        </span>
                                    </div>
                                    {moduleMinDuration && moduleMinDuration > 0 ? (
                                        <>
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                                                <div
                                                    className={`h-full transition-all duration-500 ${moduleTimeSpent >= (moduleMinDuration * 60) ? 'bg-green-500' : 'bg-primary'}`}
                                                    style={{ width: `${Math.min((moduleTimeSpent / (moduleMinDuration * 60)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono text-right">
                                                Minimo: {moduleMinDuration}m
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                            Nessun limite minimo
                                        </div>
                                    )}
                                </div>
                            </div>

                            {timeLeft !== null && (
                                <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-destructive' : 'text-primary'}`}>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Domanda {currentQuestion + 1} di {quiz.questions.length}</span>
                            <span>Tentativo {attempts + 1} di {maxAttempts}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <Card className="glass border-border mb-6">
                    <CardHeader>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold text-lg">{currentQuestion + 1}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                        {currentQ.type === 'TRUE_FALSE' ? 'Vero/Falso' : 'Scelta Multipla'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">Punti: {currentQ.points}</span>
                                </div>
                                <CardTitle className="text-xl">{currentQ.question}</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {currentQ.type === 'SHORT_ANSWER' ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        className="w-full p-4 rounded-xl bg-muted/50 border-2 border-border focus:border-primary focus:outline-none text-lg"
                                        placeholder="Scrivi la tua risposta qui..."
                                        value={answers[currentQ.id] as string || ''}
                                        onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className={`grid gap-3 ${currentQ.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {options.map((option: string, index: number) => {
                                        const isSelected = currentQ.type === 'MULTI_SELECT'
                                            ? (answers[currentQ.id] as number[] || []).includes(index)
                                            : answers[currentQ.id] === index

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleAnswer(currentQ.id, index)}
                                                className={`w-full text-left p-4 rounded-xl transition-all ${isSelected
                                                    ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/10'
                                                    : 'bg-muted/50 border-2 border-border hover:bg-muted hover:border-border'
                                                    } ${currentQ.type === 'TRUE_FALSE' ? 'text-center py-8 text-xl font-semibold' : ''}`}
                                            >
                                                <div className={`flex items-center gap-3 ${currentQ.type === 'TRUE_FALSE' ? 'justify-center' : ''}`}>
                                                    {currentQ.type !== 'TRUE_FALSE' && (
                                                        <div className={`w-6 h-6 rounded ${currentQ.type === 'MULTI_SELECT' ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center ${isSelected
                                                            ? 'border-primary bg-primary'
                                                            : 'border-muted-foreground'
                                                            }`}>
                                                            {isSelected && (
                                                                currentQ.type === 'MULTI_SELECT' ? (
                                                                    <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <div className="w-3 h-3 bg-primary-foreground rounded-full" />
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                    <span>{option}</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                        className="border-border hover:bg-accent hover:text-accent-foreground"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Precedente
                    </Button>

                    <div className="text-sm text-muted-foreground">
                        {Object.keys(answers).length} / {quiz.questions.length} risposte
                    </div>

                    {currentQuestion < quiz.questions.length - 1 ? (
                        <Button
                            onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            Successiva
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Invio...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Invia Quiz
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
