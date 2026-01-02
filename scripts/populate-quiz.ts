import { db } from '../lib/db'

async function populateQuiz() {
    console.log('📝 Populating quiz for PRIMO CORSO...\n')

    try {
        // Find the course and its modules
        const course = await db.course.findFirst({
            where: { title: 'PRIMO CORSO' },
            include: {
                modules: {
                    include: {
                        quiz: true
                    }
                }
            }
        })

        if (!course) {
            console.log('❌ Course not found')
            return
        }

        // Find a module with a quiz (or create one if needed, but let's assume one exists from previous checks)
        // The previous check showed "QUIZ 1" in "MODULO 2"
        const moduleWithQuiz = course.modules.find(m => m.quiz !== null)

        if (!moduleWithQuiz || !moduleWithQuiz.quiz) {
            console.log('❌ No quiz found in course modules')
            return
        }

        const quizId = moduleWithQuiz.quiz.id
        console.log(`✅ Found quiz: ${moduleWithQuiz.quiz.title} (ID: ${quizId})`)

        // Add sample questions
        const questions = [
            {
                text: "Qual è il tag HTML corretto per il titolo più grande?",
                options: ["<head>", "<h6>", "<h1>", "<header>"],
                correctOption: 2 // <h1>
            },
            {
                text: "Quale attributo HTML viene utilizzato per definire gli stili in linea?",
                options: ["class", "style", "font", "styles"],
                correctOption: 1 // style
            },
            {
                text: "Qual è il significato dell'acronimo HTML?",
                options: [
                    "Hyper Text Markup Language",
                    "Home Tool Markup Language",
                    "Hyperlinks and Text Markup Language",
                    "Hyper Tool Multi Language"
                ],
                correctOption: 0 // Hyper Text Markup Language
            }
        ]

        console.log('➕ Adding questions...')

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i]
            await db.question.create({
                data: {
                    quizId: quizId,
                    question: q.text,
                    options: q.options,
                    correctAnswer: q.correctOption,
                    position: i
                }
            })
        }

        console.log('✅ Questions added successfully!')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

populateQuiz()
    .then(() => process.exit(0))
    .catch(console.error)
