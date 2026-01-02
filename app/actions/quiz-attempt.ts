"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendQuizResultEmail } from "@/lib/email"
import { trackQuizCompletion } from "@/lib/gamification"
import { notifyTMSQuizCompleted } from "@/lib/tms-webhook-service"

export async function submitQuizAttempt(quizId: string, answers: Record<string, any>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Non autorizzato" }

    try {
        // Get quiz with questions
        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    orderBy: { position: "asc" }
                },
                module: true
            }
        })

        if (!quiz) return { success: false, message: "Quiz non trovato" }

        // Check max attempts
        // Check max attempts - REMOVED as per user request
        /*
        const attemptCount = await db.quizAttempt.count({
            where: {
                quizId,
                userId: session.user.id
            }
        })

        if (attemptCount >= quiz.maxAttempts) {
            return { success: false, message: "Hai raggiunto il numero massimo di tentativi" }
        }
        */

        // Calculate score
        let correctAnswersCount = 0
        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0)
        let earnedPoints = 0

        const answerRecords = quiz.questions.map(question => {
            const userAnswer = answers[question.id]
            let isCorrect = false
            let selectedOption: number | null = null
            let selectedOptions: any = null
            let textAnswer: string | null = null

            if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
                selectedOption = userAnswer as number
                isCorrect = selectedOption === question.correctAnswer
            } else if (question.type === "MULTI_SELECT") {
                selectedOptions = userAnswer as number[] // Array of selected indices
                // @ts-ignore
                const correctOptions = question.correctAnswers as number[] || []

                // Check if arrays match (ignoring order)
                if (Array.isArray(selectedOptions) && Array.isArray(correctOptions)) {
                    isCorrect = selectedOptions.length === correctOptions.length &&
                        selectedOptions.every(val => correctOptions.includes(val))
                }
            } else if (question.type === "SHORT_ANSWER") {
                textAnswer = userAnswer as string
                // @ts-ignore
                const correctAnswerText = question.textAnswer || ""

                // Case insensitive comparison
                isCorrect = textAnswer?.trim().toLowerCase() === correctAnswerText.trim().toLowerCase()
            }

            if (isCorrect) {
                correctAnswersCount++
                earnedPoints += question.points
            }

            return {
                questionId: question.id,
                selectedOption,
                selectedOptions,
                textAnswer,
                isCorrect
            }
        })

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
        const passed = score >= quiz.passingScore

        // Create attempt
        const attempt = await db.quizAttempt.create({
            data: {
                quizId,
                userId: session.user.id,
                score,
                passed,
                answers: {
                    create: answerRecords
                }
            },
            include: {
                answers: true
            }
        })

        // Gamification: Track completion and award points
        if (passed) {
            await trackQuizCompletion(session.user.id, quizId, score)

            // Check if this completes the course
            const { checkAndCompleteCourse } = await import("@/lib/progress")
            await checkAndCompleteCourse(quiz.module.courseId, session.user.id)
        }

        if (session.user.email) {
            await sendQuizResultEmail(session.user.email, quiz.title, passed, score)
        }

        // Notify TMS about quiz completion
        notifyTMSQuizCompleted(session.user.id, attempt.id).catch(err =>
            console.error("[TMS_WEBHOOK] Quiz completion notification failed:", err)
        )

        revalidatePath(`/courses`)
        return {
            success: true,
            attemptId: attempt.id,
            score,
            passed,
            correctAnswers: correctAnswersCount,
            totalQuestions: quiz.questions.length
        }
    } catch (error) {
        console.error("Quiz submission error:", error)
        return { success: false, message: "Errore durante l'invio del quiz" }
    }
}

export async function getQuizResults(attemptId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    try {
        const attempt = await db.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                quiz: {
                    include: {
                        questions: {
                            orderBy: { position: "asc" }
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

        if (!attempt || attempt.userId !== session.user.id) return null

        return attempt
    } catch (error) {
        return null
    }
}

export async function canTakeQuiz(quizId: string) {
    const session = await auth()
    if (!session?.user?.id) return { canTake: false, message: "Non autorizzato" }

    try {
        const quiz = await db.quiz.findUnique({
            where: { id: quizId }
        })

        if (!quiz) return { canTake: false, message: "Quiz non trovato" }

        const attemptCount = await db.quizAttempt.count({
            where: {
                quizId,
                userId: session.user.id
            }
        })

        // Always allow retaking
        return {
            canTake: true,
            attempts: attemptCount,
            maxAttempts: Infinity // quiz.maxAttempts
        }
    } catch (error) {
        return { canTake: false, message: "Errore" }
    }
}
