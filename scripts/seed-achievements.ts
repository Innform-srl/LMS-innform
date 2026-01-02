import { db } from "@/lib/db"

const achievements = [
    // First Steps
    {
        name: "🎓 Primo Passo",
        description: "Completa il tuo primo corso",
        icon: "🎓",
        points: 50,
        category: "COURSE",
        requirementType: "COMPLETE_COURSES",
        requirementValue: 1
    },
    {
        name: "📝 Studente Diligente",
        description: "Supera il tuo primo quiz",
        icon: "📝",
        points: 25,
        category: "QUIZ",
        requirementType: "PASS_QUIZZES",
        requirementValue: 1
    },
    {
        name: "⏱️ Primo Tempo",
        description: "Studia per almeno 1 ora",
        icon: "⏱️",
        points: 30,
        category: "TIME",
        requirementType: "STUDY_TIME",
        requirementValue: 60
    },

    // Course Completion
    {
        name: "🏆 Esperto",
        description: "Completa 5 corsi",
        icon: "🏆",
        points: 200,
        category: "COURSE",
        requirementType: "COMPLETE_COURSES",
        requirementValue: 5
    },
    {
        name: "🌟 Maestro",
        description: "Completa 10 corsi",
        icon: "🌟",
        points: 500,
        category: "COURSE",
        requirementType: "COMPLETE_COURSES",
        requirementValue: 10
    },
    {
        name: "💎 Leggenda",
        description: "Completa 25 corsi",
        icon: "💎",
        points: 1000,
        category: "COURSE",
        requirementType: "COMPLETE_COURSES",
        requirementValue: 25
    },

    // Quiz Mastery
    {
        name: "✨ Quiz Master",
        description: "Supera 10 quiz",
        icon: "✨",
        points: 150,
        category: "QUIZ",
        requirementType: "PASS_QUIZZES",
        requirementValue: 10
    },
    {
        name: "💯 Perfezionista",
        description: "Ottieni 100% in 5 quiz",
        icon: "💯",
        points: 200,
        category: "QUIZ",
        requirementType: "PASS_QUIZZES",
        requirementValue: 5
    },

    // Streak
    {
        name: "🔥 In Fiamme",
        description: "Streak di 7 giorni consecutivi",
        icon: "🔥",
        points: 100,
        category: "STREAK",
        requirementType: "STREAK_DAYS",
        requirementValue: 7
    },
    {
        name: "⚡ Inarrestabile",
        description: "Streak di 30 giorni consecutivi",
        icon: "⚡",
        points: 500,
        category: "STREAK",
        requirementType: "STREAK_DAYS",
        requirementValue: 30
    },

    // Study Time
    {
        name: "📚 Maratoneta",
        description: "Raggiungi 10 ore di studio totali",
        icon: "📚",
        points: 200,
        category: "TIME",
        requirementType: "STUDY_TIME",
        requirementValue: 600 // 10 hours
    },
    {
        name: "🎯 Dedicato",
        description: "Raggiungi 50 ore di studio totali",
        icon: "🎯",
        points: 750,
        category: "TIME",
        requirementType: "STUDY_TIME",
        requirementValue: 3000 // 50 hours
    },

    // Points Milestones
    {
        name: "🌠 Stella Nascente",
        description: "Raggiungi 1000 punti totali",
        icon: "🌠",
        points: 100,
        category: "SPECIAL",
        requirementType: "TOTAL_POINTS",
        requirementValue: 1000
    },
    {
        name: "🚀 Supernova",
        description: "Raggiungi 5000 punti totali",
        icon: "🚀",
        points: 500,
        category: "SPECIAL",
        requirementType: "TOTAL_POINTS",
        requirementValue: 5000
    }
]

async function seed() {
    console.log("🌱 Seeding achievements...")

    for (const achievement of achievements) {
        await db.achievement.upsert({
            where: { name: achievement.name },
            update: achievement,
            create: achievement
        })
    }

    console.log(`✅ Created ${achievements.length} achievements`)
}

seed()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
