import { db } from '../lib/db'

async function checkQuizAttempts() {
    console.log('🔍 Checking Quiz Attempts for test@innform.com...\n')

    const user = await db.user.findUnique({
        where: { email: 'test@innform.com' },
        include: {
            quizAttempts: {
                include: { quiz: true },
                orderBy: { completedAt: 'desc' }
            }
        }
    })

    if (!user) {
        console.log('❌ User test@innform.com not found')
        return
    }

    console.log(`User: ${user.name}`)
    console.log(`Attempts: ${user.quizAttempts.length}`)

    user.quizAttempts.forEach(attempt => {
        console.log(`- Quiz: ${attempt.quiz.title}`)
        console.log(`  Score: ${attempt.score}%`)
        console.log(`  Passed: ${attempt.passed ? '✅' : '❌'}`)
        console.log(`  ID: ${attempt.id}`)
        console.log(`  Link: http://localhost:3005/api/certificate/${attempt.id}`)
        console.log('---')
    })
}

checkQuizAttempts()
    .then(() => process.exit(0))
    .catch(console.error)
