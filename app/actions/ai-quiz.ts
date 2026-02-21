"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"

const questionSchema = z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correctAnswer: z.number().min(0).max(3),
    explanation: z.string()
})

const quizSchema = z.object({
    questions: z.array(questionSchema)
})

export async function generateQuizQuestions(topic: string, count: number = 5) {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        return { success: false, error: "Chiave API Gemini non configurata" }
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        const prompt = `
            Genera un quiz di ${count} domande a risposta multipla sull'argomento: "${topic}".
            
            Rispondi ESCLUSIVAMENTE con un oggetto JSON valido che segua questa struttura:
            {
                "questions": [
                    {
                        "question": "Testo della domanda",
                        "options": ["Opzione 1", "Opzione 2", "Opzione 3", "Opzione 4"],
                        "correctAnswer": 0, // Indice della risposta corretta (0-3)
                        "explanation": "Spiegazione breve della risposta corretta"
                    }
                ]
            }
            
            Assicurati che:
            1. Le domande siano in italiano.
            2. Ci siano esattamente 4 opzioni per ogni domanda.
            3. L'indice della risposta corretta sia valido (0-3).
            4. Il JSON sia valido e non contenga altro testo prima o dopo.
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean up markdown code blocks if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

        const parsed = JSON.parse(cleanedText)
        const validated = quizSchema.safeParse(parsed)

        if (!validated.success) {
            console.error("Validation error:", validated.error)
            return { success: false, error: "Formato risposta non valido" }
        }

        return { success: true, questions: validated.data.questions }

    } catch (error: unknown) {
        console.error("Gemini API Error:", error)
        return {
            success: false,
            error: `Errore: ${error instanceof Error ? error.message : "Errore sconosciuto durante la generazione"}`
        }
    }
}
