import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const attempts = await prisma.quizAttempt.findMany({
        include: {
            quiz: {
                select: {
                    title: true
                }
            },
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        },
        orderBy: {
            completedAt: 'desc'
        }
    })

    console.log('\n📊 Quiz Attempts:\n')

    if (attempts.length === 0) {
        console.log('No quiz attempts found.')
    } else {
        attempts.forEach((attempt, index) => {
            console.log(`${index + 1}. Attempt ID: ${attempt.id}`)
            console.log(`   User: ${attempt.user.name} (${attempt.user.email})`)
            console.log(`   Quiz: ${attempt.quiz.title}`)
            console.log(`   Score: ${attempt.score}%`)
            console.log(`   Status: ${attempt.passed ? '✅ PASSED' : '❌ FAILED'}`)
            console.log(`   Completed: ${attempt.completedAt}`)
            console.log('')
        })
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
