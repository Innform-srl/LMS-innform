import { db } from '../lib/db'

async function debugCertificate() {
    console.log('🔍 Debugging Certificate Generation...\n')

    const attemptId = 'cmietfcil000382qjsy8k3wr2' // The ID that failed

    try {
        console.log(`Fetching attempt ${attemptId}...`)
        const attempt = await db.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                quiz: {
                    include: {
                        module: {
                            include: {
                                course: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        if (!attempt) {
            console.log('❌ Attempt not found')
            return
        }

        console.log('✅ Attempt found')
        console.log('User:', attempt.user.name || attempt.user.email)
        console.log('Quiz:', attempt.quiz.title)

        // Check for potential nulls in the chain
        if (!attempt.quiz.module) {
            console.log('❌ attempt.quiz.module is NULL')
        } else {
            console.log('✅ attempt.quiz.module exists')
            if (!attempt.quiz.module.course) {
                console.log('❌ attempt.quiz.module.course is NULL')
            } else {
                console.log('✅ attempt.quiz.module.course exists:', attempt.quiz.module.course.title)
            }
        }

        console.log('Score:', attempt.score)
        console.log('CompletedAt:', attempt.completedAt)

        // Try to construct the strings used in the template
        const courseTitle = attempt.quiz.module.course.title
        const dateStr = new Date(attempt.completedAt).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        console.log('Course Title:', courseTitle)
        console.log('Date String:', dateStr)

        console.log('✅ Data fetching seems correct. The error might be in the HTML generation or something else.')

    } catch (error) {
        console.error('❌ Error during execution:', error)
    }
}

debugCertificate()
    .then(() => process.exit(0))
    .catch(console.error)
