import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Create admin user
    const hashedPassword = await hash('admin123', 10)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@innform.com' },
        update: {},
        create: {
            email: 'admin@innform.com',
            name: 'Admin INNFORM',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    // Create test employee
    const employee = await prisma.user.upsert({
        where: { email: 'test@innform.com' },
        update: {},
        create: {
            email: 'test@innform.com',
            name: 'Test Employee',
            password: hashedPassword,
            role: 'EMPLOYEE',
        },
    })

    console.log('✅ Users created')

    // Create Course 1: Sicurezza sul Lavoro
    const course1 = await prisma.course.create({
        data: {
            title: 'Sicurezza sul Lavoro',
            description: 'Corso fondamentale sulla sicurezza e prevenzione degli infortuni sul luogo di lavoro',
            published: true,
            isRequired: true,
            dueInDays: 30,
            minimumDuration: 120, // 2 hours
            imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
            modules: {
                create: [
                    {
                        title: 'Introduzione alla Sicurezza',
                        description: 'Panoramica delle norme di sicurezza e legislazione italiana',
                        position: 1,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 900,
                    },
                    {
                        title: 'Dispositivi di Protezione Individuale (DPI)',
                        description: 'Come utilizzare correttamente i DPI sul luogo di lavoro',
                        position: 2,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 1200,
                        quiz: {
                            create: {
                                title: 'Quiz DPI',
                                description: 'Verifica le tue conoscenze sui dispositivi di protezione',
                                passingScore: 70,
                                maxAttempts: 3,
                                questions: {
                                    create: [
                                        {
                                            question: 'Quando è obbligatorio indossare il casco di protezione?',
                                            type: 'MULTIPLE_CHOICE',
                                            options: ['Solo in cantiere', 'In tutte le aree a rischio di caduta oggetti', 'Mai', 'Solo su richiesta'],
                                            correctAnswer: 1, // Index of 'In tutte le aree...'
                                            explanation: 'Il casco deve essere indossato in tutte le zone dove c\'è rischio di caduta oggetti dall\'alto',
                                            position: 1,
                                        },
                                        {
                                            question: 'I DPI devono essere sostituiti periodicamente?',
                                            type: 'TRUE_FALSE',
                                            options: ['Vero', 'Falso'],
                                            correctAnswer: 0, // Index of 'Vero'
                                            explanation: 'I DPI hanno una scadenza e vanno sostituiti secondo le indicazioni del produttore',
                                            position: 2,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        title: 'Gestione delle Emergenze',
                        description: 'Procedure da seguire in caso di emergenza',
                        position: 3,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 1080,
                    },
                ],
            },
        },
    })

    // Create Course 2: Privacy e GDPR
    const course2 = await prisma.course.create({
        data: {
            title: 'Privacy e GDPR',
            description: 'Normativa sulla protezione dei dati personali e compliance GDPR',
            published: true,
            isRequired: true,
            dueInDays: 15,
            minimumDuration: 90, // 1.5 hours
            imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
            modules: {
                create: [
                    {
                        title: 'Introduzione al GDPR',
                        description: 'Cos\'è il GDPR e perché è importante',
                        position: 1,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 720,
                    },
                    {
                        title: 'Trattamento Dati Personali',
                        description: 'Come gestire correttamente i dati personali in azienda',
                        position: 2,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 900,
                        quiz: {
                            create: {
                                title: 'Quiz Privacy',
                                description: 'Verifica comprensione normativa privacy',
                                passingScore: 80,
                                maxAttempts: 3,
                                questions: {
                                    create: [
                                        {
                                            question: 'Quale dato NON è considerato personale?',
                                            type: 'MULTIPLE_CHOICE',
                                            options: ['Email aziendale', 'Numero di telefono', 'Dati statistici anonimi', 'Indirizzo di casa'],
                                            correctAnswer: 2, // Index of 'Dati statistici anonimi'
                                            explanation: 'I dati anonimi non permettono l\'identificazione della persona',
                                            position: 1,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        title: 'Data Breach e Sanzioni',
                        description: 'Cosa fare in caso di violazione dati e le conseguenze',
                        position: 3,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 780,
                    },
                ],
            },
        },
    })

    // Create Course 3: Customer Service Excellence
    const course3 = await prisma.course.create({
        data: {
            title: 'Customer Service Excellence',
            description: 'Tecniche avanzate per un servizio clienti di qualità',
            published: true,
            isRequired: false,
            minimumDuration: 60, // 1 hour
            imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
            modules: {
                create: [
                    {
                        title: 'Fondamenti del Customer Service',
                        description: 'Le basi per un ottimo servizio clienti',
                        position: 1,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 600,
                    },
                    {
                        title: 'Gestione Reclami',
                        description: 'Come trasformare un reclamo in opportunità',
                        position: 2,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 720,
                        quiz: {
                            create: {
                                title: 'Quiz Customer Service',
                                description: 'Test sulle competenze di customer service',
                                passingScore: 70,
                                maxAttempts: 5,
                                questions: {
                                    create: [
                                        {
                                            question: 'Qual è il primo passo nella gestione di un reclamo?',
                                            type: 'MULTIPLE_CHOICE',
                                            options: ['Ascoltare il cliente', 'Dare subito una soluzione', 'Trasferire ad un superiore', 'Giustificarsi'],
                                            correctAnswer: 0, // Index of 'Ascoltare il cliente'
                                            explanation: 'L\'ascolto attivo è fondamentale per comprendere il problema del cliente',
                                            position: 1,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        title: 'Comunicazione Efficace',
                        description: 'Tecniche di comunicazione per soddisfare il cliente',
                        position: 3,
                        published: true,
                        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoDuration: 540,
                    },
                ],
            },
        },
    })

    console.log('✅ Courses created')

    // Enroll test employee in courses
    await prisma.enrollment.create({
        data: {
            userId: employee.id,
            courseId: course1.id,
            progress: 0,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    })

    console.log('✅ Enrollments created')

    // Create default certificate settings
    await prisma.certificateSettings.create({
        data: {
            companyName: 'INNFORM S.r.l.',
            signerName: 'Mario Rossi',
            signerTitle: 'Direttore Generale',
            primaryColor: '#6366f1',
            accentColor: '#8b5cf6',
            headerText: 'Certificato di Completamento',
            bodyTemplate: 'Questo certifica che {userName} ha completato con successo il corso {courseTitle} in data {completionDate}',
        },
    })

    console.log('✅ Certificate settings created')
    console.log('🎉 Seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Admin: admin@innform.com / admin123`)
    console.log(`- Employee: test@innform.com / admin123`)
    console.log(`- Courses: 3 courses with modules and quizzes`)
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
