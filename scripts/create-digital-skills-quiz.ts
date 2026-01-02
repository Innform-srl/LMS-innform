import { db } from '../lib/db'

async function createQuizForModule() {
    // Find the course and its third module (LEZIONE 3 - QUIZ)
    const course = await db.course.findFirst({
        where: {
            title: {
                contains: "COMPETENZE DIGITALI"
            }
        },
        include: {
            modules: {
                orderBy: { position: 'asc' }
            }
        }
    })

    if (!course) {
        console.log("Corso non trovato!")
        return
    }

    const thirdModule = course.modules.find(m => m.position === 2) // LEZIONE 3
    if (!thirdModule) {
        console.log("Modulo 3 non trovato!")
        return
    }

    // Check if quiz already exists
    const existingQuiz = await db.quiz.findFirst({
        where: { moduleId: thirdModule.id }
    })

    if (existingQuiz) {
        console.log("Quiz già esistente per questo modulo!")
        console.log("Quiz ID:", existingQuiz.id)
        return
    }

    // Create quiz
    const quiz = await db.quiz.create({
        data: {
            title: "Test Competenze Digitali",
            description: "Verifica le tue conoscenze sulle competenze digitali di base",
            passingScore: 70,
            published: true,
            moduleId: thirdModule.id
        }
    })

    console.log("✅ Quiz creato:", quiz.id)

    // Create questions
    const questions = [
        {
            question: "Qual è la funzione principale di un browser web?",
            options: JSON.stringify([
                "Inviare email",
                "Navigare su Internet",
                "Modificare documenti",
                "Creare presentazioni"
            ]),
            correctAnswer: 1,
            position: 0,
            quizId: quiz.id
        },
        {
            question: "Cosa significa 'Cloud Computing'?",
            options: JSON.stringify([
                "Archiviazione locale dei dati",
                "Utilizzo di servizi e risorse tramite Internet",
                "Backup su disco rigido",
                "Connessione Wi-Fi"
            ]),
            correctAnswer: 1,
            position: 1,
            quizId: quiz.id
        },
        {
            question: "Quale di questi è un software per fogli di calcolo?",
            options: JSON.stringify([
                "Microsoft Word",
                "Microsoft PowerPoint",
                "Microsoft Excel",
                "Microsoft Outlook"
            ]),
            correctAnswer: 2,
            position: 2,
            quizId: quiz.id
        },
        {
            question: "Cos'è una password sicura?",
            options: JSON.stringify([
                "Il tuo nome",
                "123456",
                "Una combinazione di lettere, numeri e simboli",
                "La tua data di nascita"
            ]),
            correctAnswer: 2,
            position: 3,
            quizId: quiz.id
        },
        {
            question: "Cosa  significa 'PDF'?",
            options: JSON.stringify([
                "Personal Document File",
                "Portable Document Format",
                "Print Document File",
                "Public Data Format"
            ]),
            correctAnswer: 1,
            position: 4,
            quizId: quiz.id
        }
    ]

    for (const q of questions) {
        await db.question.create({ data: q })
    }

    console.log("✅ Create 5 domande per il quiz!")
    console.log("\n📝 Dettagli:")
    console.log("- Corso:", course.title)
    console.log("- Modulo:", thirdModule.title)
    console.log("- Quiz:", quiz.title)
    console.log("- Punteggio minimo:", quiz.passingScore + "%")
    console.log("- Domande:", questions.length)
}

createQuizForModule()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
