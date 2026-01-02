import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Create employee user if doesn't exist
    let employee = await prisma.user.findUnique({
        where: { email: 'mario.rossi@innform.com' }
    })

    if (!employee) {
        const hashedPassword = await bcrypt.hash('password', 10)
        employee = await prisma.user.create({
            data: {
                email: 'mario.rossi@innform.com',
                name: 'Mario Rossi',
                password: hashedPassword,
                role: 'EMPLOYEE'
            }
        })
        console.log(`✅ Created employee user: ${employee.name}`)
    } else {
        console.log(`👤 Using existing employee: ${employee.name}`)
    }

    // Get the quiz
    const quiz = await prisma.quiz.findFirst({
        where: { title: 'Quiz Sicurezza sul Lavoro' },
        include: {
            questions: true
        }
    })

    if (!quiz) {
        console.error('❌ Quiz not found')
        return
    }

    console.log(`\n📝 Creating quiz attempts for ${employee.name}...\n`)

    // Get questions for the quiz
    const questions = quiz.questions.sort((a, b) => a.position - b.position)

    // Create a passing attempt (4 out of 5 correct = 80%)
    const passingAnswers = [1, 0, 2, 0, 1] // Correct answers
    const attempt1 = await prisma.quizAttempt.create({
        data: {
            userId: employee.id,
            quizId: quiz.id,
            score: 80,
            passed: true,
            completedAt: new Date(),
            answers: {
                create: questions.map((q, index) => ({
                    questionId: q.id,
                    selectedOption: passingAnswers[index],
                    isCorrect: passingAnswers[index] === q.correctAnswer
                }))
            }
        }
    })

    console.log(`✅ Created PASSING attempt: ${attempt1.id}`)
    console.log(`   Score: ${attempt1.score}%`)
    console.log(`   Status: PASSED`)
    console.log(`   URL: http://localhost:3005/quiz/${quiz.id}/results/${attempt1.id}`)

    // Create a failing attempt (2 out of 5 correct = 40%)
    const failingAnswers = [0, 1, 0, 1, 0] // Wrong answers
    const attempt2 = await prisma.quizAttempt.create({
        data: {
            userId: employee.id,
            quizId: quiz.id,
            score: 40,
            passed: false,
            completedAt: new Date(),
            answers: {
                create: questions.map((q, index) => ({
                    questionId: q.id,
                    selectedOption: failingAnswers[index],
                    isCorrect: failingAnswers[index] === q.correctAnswer
                }))
            }
        }
    })

    console.log(`\n❌ Created FAILING attempt: ${attempt2.id}`)
    console.log(`   Score: ${attempt2.score}%`)
    console.log(`   Status: FAILED`)
    console.log(`   URL: http://localhost:3005/quiz/${quiz.id}/results/${attempt2.id}`)

    console.log('\n✨ Done! You can now test the results pages.')
    console.log(`\nLogin credentials:`)
    console.log(`Email: mario.rossi@innform.com`)
    console.log(`Password: password`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
