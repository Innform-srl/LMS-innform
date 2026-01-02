import { db } from '../lib/db'

async function checkQuizzes() {
    console.log('📋 Checking quizzes in database...\n')

    try {
        // Trova tutti i quiz
        const quizzes = await db.quiz.findMany({
            include: {
                module: {
                    include: {
                        course: {
                            select: {
                                title: true
                            }
                        }
                    }
                },
                _count: {
                    select: { questions: true }
                }
            }
        })

        if (quizzes.length === 0) {
            console.log('❌ Nessun quiz trovato nel database')
            console.log('\n💡 Suggerimento: Crea quiz via UI in /admin/courses/[courseId]/modules/[moduleId]/quiz/create')
            return
        }

        console.log(`✅ Trovati ${quizzes.length} quiz:\n`)

        quizzes.forEach((quiz, index) => {
            console.log(`${index + 1}. ${quiz.title}`)
            console.log(`   Corso: ${quiz.module.course.title}`)
            console.log(`   Modulo: ${quiz.module.title}`)
            console.log(`   Domande: ${quiz._count.questions}`)
            console.log(`   Pass Score: ${quiz.passingScore}%`)
            console.log(`   Tempo Limite: ${quiz.timeLimit ? `${quiz.timeLimit} min` : 'Nessuno'}`)
            console.log(`   Pubblicato: ${quiz.published ? '✅' : '❌'}`)
            console.log('')
        })

        // Analisi
        const withoutQuestions = quizzes.filter(q => q._count.questions === 0)
        const unpublished = quizzes.filter(q => !q.published)

        if (withoutQuestions.length > 0) {
            console.log(`⚠️  ${withoutQuestions.length} quiz senza domande:`)
            withoutQuestions.forEach(q => console.log(`   - ${q.title}`))
            console.log('')
        }

        if (unpublished.length > 0) {
            console.log(`⚠️  ${unpublished.length} quiz non pubblicati:`)
            unpublished.forEach(q => console.log(`   - ${q.title}`))
            console.log('')
        }

        // Recommendations
        console.log('📝 Raccomandazioni:')
        if (withoutQuestions.length > 0) {
            console.log('   - Aggiungi domande ai quiz vuoti')
        }
        if (unpublished.length > 0) {
            console.log('   - Pubblica quiz completati')
        }
        if (quizzes.every(q => q._count.questions >= 3 && q.published)) {
            console.log('   ✅ Tutti i quiz sono pronti!')
        }

    } catch (error) {
        console.error('❌ Errore:', error)
        process.exit(1)
    }
}

checkQuizzes()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
