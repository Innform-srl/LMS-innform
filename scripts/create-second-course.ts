import { db } from '../lib/db'

async function createSecondCourse() {
    console.log('🚀 Creating second test course: "Sicurezza sul Lavoro"...\n')

    try {
        // 1. Create Course
        const course = await db.course.create({
            data: {
                title: "Sicurezza sul Lavoro",
                description: "Corso fondamentale sulla sicurezza e salute nei luoghi di lavoro (D.Lgs 81/08).",
                imageUrl: "/images/safety-course.jpg",
                published: true
            }
        })
        console.log(`✅ Course created: ${course.title}`)

        // 2. Create Modules
        const modulesData = [
            {
                title: "Introduzione alla Sicurezza",
                description: "Panoramica normativa e concetti base di prevenzione.",
                position: 0,
                published: true,
                videoUrl: "https://www.youtube.com/watch?v=k1lC4X_Fh28",
                videoDuration: 480
            },
            {
                title: "Rischi Specifici",
                description: "Identificazione e gestione dei rischi comuni in ufficio.",
                position: 1,
                published: true,
                videoUrl: "https://www.youtube.com/watch?v=M6X95_d3XjU",
                videoDuration: 600
            },
            {
                title: "Gestione delle Emergenze",
                description: "Procedure di evacuazione e primo soccorso.",
                position: 2,
                published: true,
                videoUrl: "https://www.youtube.com/watch?v=0g7wHq6w3k0",
                videoDuration: 350
            }
        ]

        const createdModules = []
        for (const m of modulesData) {
            const module = await db.module.create({
                data: {
                    courseId: course.id,
                    ...m
                }
            })
            createdModules.push(module)
            console.log(`✅ Module created: ${module.title}`)
        }

        // 3. Create Quiz for the last module
        const lastModule = createdModules[createdModules.length - 1]

        const quiz = await db.quiz.create({
            data: {
                moduleId: lastModule.id,
                title: "Test Finale Sicurezza",
                description: "Verifica delle competenze acquisite sulla sicurezza.",
                passingScore: 80
            }
        })
        console.log(`✅ Quiz created: ${quiz.title}`)

        // 4. Create Questions
        const questionsData = [
            {
                question: "Qual è il principale riferimento normativo per la sicurezza sul lavoro in Italia?",
                options: ["D.Lgs 81/08", "Costituzione", "Codice Civile", "Norma ISO 9001"],
                correctAnswer: 0
            },
            {
                question: "Cosa si intende per DPI?",
                options: [
                    "Documento Prevenzione Incendi",
                    "Dispositivi di Protezione Individuale",
                    "Dipartimento Protezione Italia",
                    "Diritto Per Infortuni"
                ],
                correctAnswer: 1
            },
            {
                question: "In caso di allarme antincendio, cosa NON fare?",
                options: [
                    "Mantenere la calma",
                    "Seguire le vie di fuga",
                    "Usare l'ascensore",
                    "Raggiungere il punto di raccolta"
                ],
                correctAnswer: 2
            },
            {
                question: "Chi è il responsabile della sicurezza in azienda?",
                options: [
                    "Il Datore di Lavoro",
                    "Il dipendente più anziano",
                    "Il sindacato",
                    "Il portinaio"
                ],
                correctAnswer: 0
            }
        ]

        for (let i = 0; i < questionsData.length; i++) {
            const q = questionsData[i]
            await db.question.create({
                data: {
                    quizId: quiz.id,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    position: i
                }
            })
        }
        console.log(`✅ Added ${questionsData.length} questions to quiz`)

        console.log(`\n🎉 Second course fully populated and published!`)

    } catch (error) {
        console.error('❌ Error creating course:', error)
    }
}

createSecondCourse()
    .then(() => process.exit(0))
    .catch(console.error)
