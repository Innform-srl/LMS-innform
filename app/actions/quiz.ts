"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { reportError } from "@/lib/error-reporting"

const quizSchema = z.object({
    title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
    description: z.string().optional(),
    passingScore: z.number().min(0).max(100).default(70),
    timeLimit: z.number().optional(),
    maxAttempts: z.number().min(1).default(3),
})

const _questionSchema = z.object({
    question: z.string().min(1, { message: "La domanda è obbligatoria" }),
    type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTI_SELECT", "SHORT_ANSWER"]).default("MULTIPLE_CHOICE"),
    explanation: z.string().optional(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.number().min(0).max(3).optional(),
    points: z.number().min(1).default(1),
})


export async function createQuiz(moduleId: string, formData: FormData) {
    const check = await requirePermission("quiz:create")
    if (!check.authorized) throw new Error(check.error)

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const passingScore = parseInt(formData.get("passingScore") as string) || 70
    const timeLimit = formData.get("timeLimit") ? parseInt(formData.get("timeLimit") as string) : null
    const maxAttempts = parseInt(formData.get("maxAttempts") as string) || 3

    // Handle AI generated questions
    const aiQuestionsJson = formData.get("aiQuestions") as string
    let aiQuestions: { question: string; options: string[]; correctAnswer: number; explanation?: string }[] = []
    if (aiQuestionsJson) {
        try {
            aiQuestions = JSON.parse(aiQuestionsJson)
        } catch (e) {
            console.error("Error parsing AI questions:", e)
            reportError(e, { action: "createQuiz.parseAIQuestions" })
        }
    }

    const validatedFields = quizSchema.safeParse({
        title,
        description,
        passingScore,
        timeLimit: timeLimit || undefined,
        maxAttempts
    })

    if (!validatedFields.success) {
        throw new Error("Campi non validi")
    }

    try {
        const quiz = await db.quiz.create({
            data: {
                moduleId,
                title,
                description: description || null,
                passingScore,
                timeLimit,
                maxAttempts,
                // Create questions if provided
                questions: aiQuestions.length > 0 ? {
                    create: aiQuestions.map((q, index) => ({
                        question: q.question,
                        type: "MULTIPLE_CHOICE",
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        position: index,
                        points: 1
                    }))
                } : undefined
            }
        })

        revalidatePath(`/admin/courses`)
        redirect(`/admin/quiz/${quiz.id}`)
    } catch (error) {
        console.error("Error creating quiz:", error)
        reportError(error, { action: "createQuiz" })
        throw new Error("Errore durante la creazione del quiz")
    }
}

export async function addQuestion(quizId: string, prevState: { message: string; success?: boolean } | null, formData: FormData) {
    const check = await requirePermission("quiz:edit")
    if (!check.authorized) return { message: check.error }

    const question = formData.get("question") as string
    const type = formData.get("type") as string || "MULTIPLE_CHOICE"
    const explanation = formData.get("explanation") as string

    let options: string[] = []
    const correctAnswers: number[] = []
    let textAnswer: string | undefined = undefined
    let correctAnswer = 0

    if (type === "MULTIPLE_CHOICE") {
        options = [
            formData.get("option0") as string,
            formData.get("option1") as string,
            formData.get("option2") as string,
            formData.get("option3") as string,
        ]
        correctAnswer = parseInt(formData.get("correctAnswer") as string)
    } else if (type === "MULTI_SELECT") {
        options = [
            formData.get("option0") as string,
            formData.get("option1") as string,
            formData.get("option2") as string,
            formData.get("option3") as string,
        ]
        // Check which options are marked as correct
        if (formData.get("correctOption0")) correctAnswers.push(0)
        if (formData.get("correctOption1")) correctAnswers.push(1)
        if (formData.get("correctOption2")) correctAnswers.push(2)
        if (formData.get("correctOption3")) correctAnswers.push(3)
    } else if (type === "SHORT_ANSWER") {
        textAnswer = formData.get("textAnswer") as string
    } else {
        // TRUE_FALSE
        options = ["Vero", "Falso"]
        correctAnswer = parseInt(formData.get("correctAnswer") as string)
    }

    const points = parseInt(formData.get("points") as string) || 1

    // Validate based on type
    if (type === "MULTI_SELECT" && correctAnswers.length === 0) {
        return { message: "Seleziona almeno una risposta corretta" }
    }
    if (type === "SHORT_ANSWER" && !textAnswer) {
        return { message: "Inserisci la risposta corretta" }
    }

    try {
        const maxPosition = await db.question.findFirst({
            where: { quizId },
            orderBy: { position: "desc" },
            select: { position: true }
        })

        await db.question.create({
            data: {
                quizId,
                question,
                type,
                explanation: explanation || null,
                options: type === "SHORT_ANSWER" ? [] : options,
                correctAnswer: type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE" ? correctAnswer : 0,
                correctAnswers: type === "MULTI_SELECT" ? correctAnswers : undefined,
                textAnswer: type === "SHORT_ANSWER" ? textAnswer : undefined,
                points,
                position: (maxPosition?.position ?? -1) + 1,
            }
        })

        revalidatePath(`/admin/quiz/${quizId}`)
        return { success: true, message: "" }
    } catch (error) {
        console.error("Error adding question:", error)
        reportError(error, { action: "addQuestion" })
        if (error instanceof Error) {
            console.error("Stack trace:", error.stack)
            return { message: `Errore: ${error.message}` }
        }
        return { message: "Errore durante l'aggiunta della domanda" }
    }
}

export async function deleteQuestion(questionId: string, quizId: string) {
    const check = await requirePermission("quiz:delete")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.question.delete({
            where: { id: questionId }
        })
        revalidatePath(`/admin/quiz/${quizId}`)
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'eliminazione" }
    }
}

export async function updateQuiz(quizId: string, formData: FormData) {
    const check = await requirePermission("quiz:edit")
    if (!check.authorized) throw new Error(check.error)

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const passingScore = parseInt(formData.get("passingScore") as string) || 70
    const timeLimit = formData.get("timeLimit") ? parseInt(formData.get("timeLimit") as string) : null
    const maxAttempts = parseInt(formData.get("maxAttempts") as string) || 3

    try {
        await db.quiz.update({
            where: { id: quizId },
            data: {
                title,
                description: description || null,
                passingScore,
                timeLimit,
                maxAttempts,
            }
        })

        revalidatePath(`/admin/quiz/${quizId}`)
    } catch (error) {
        console.error("Error updating quiz:", error)
        reportError(error, { action: "updateQuiz" })
        throw new Error("Errore durante l'aggiornamento")
    }
}
