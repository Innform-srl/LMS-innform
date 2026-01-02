import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🎮 Inserting achievements...')

    const achievements = [
        {
            name: '🎓 Primo Passo',
            description: 'Completa il tuo primo corso',
            icon: '🎓',
            points: 50,
            category: 'COURSE',
            requirementType: 'COMPLETE_COURSES',
            requirementValue: 1,
        },
        {
            name: '🏆 Esperto',
            description: 'Completa 5 corsi',
            icon: '🏆',
            points: 200,
            category: 'COURSE',
            requirementType: 'COMPLETE_COURSES',
            requirementValue: 5,
        },
        {
            name: '🔥 In Fiamme',
            description: 'Streak di 7 giorni consecutivi',
            icon: '🔥',
            points: 100,
            category: 'STREAK',
            requirementType: 'STREAK_DAYS',
            requirementValue: 7,
        },
    ]

    for (const achievement of achievements) {
        const created = await prisma.achievement.create({
            data: achievement,
        })
        console.log(`✅ Created: ${created.name}`)
    }

    console.log('\n🎉 Done! 3 achievements inserted.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
