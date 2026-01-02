import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const quizId = 'cmid02qwm0008i3c1cn371d6x'

    const questions = [
        {
            question: "Qual è il colore dei cartelli di obbligo?",
            options: ["Rosso", "Blu", "Giallo", "Verde"],
            correctAnswer: 1,
            points: 1,
            position: 0
        },
        {
            question: "Qual è il colore dei cartelli di divieto?",
            options: ["Rosso", "Blu", "Giallo", "Verde"],
            correctAnswer: 0,
            points: 1,
            position: 1
        },
        {
            question: "Qual è il colore dei cartelli di avvertimento?",
            options: ["Rosso", "Blu", "Giallo", "Verde"],
            correctAnswer: 2,
            points: 1,
            position: 2
        },
        {
            question: "Cosa significa DPI?",
            options: [
                "Dispositivo di Protezione Individuale",
                "Documento Protezione Interna",
                "Direttiva Protezione Industriale",
                "Dispositivo Prevenzione Incendi"
            ],
            correctAnswer: 0,
            points: 1,
            position: 3
        },
        {
            question: "Chi è il responsabile della sicurezza in azienda?",
            options: ["Il dipendente", "Il datore di lavoro", "Il cliente", "Il fornitore"],
            correctAnswer: 1,
            points: 1,
            position: 4
        }
    ]

    for (const q of questions) {
        await prisma.question.create({
            data: {
                quizId,
                ...q
            }
        })
    }

    console.log('✅ Added 5 questions to the quiz')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
