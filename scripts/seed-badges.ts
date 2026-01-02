import { db } from '../lib/db'

async function seedBadges() {
    console.log('🏆 Seeding Badges...\n')

    const badges = [
        {
            name: 'Primo Passo',
            description: 'Hai completato il tuo primo corso!',
            icon: 'award'
        },
        {
            name: 'Secchione',
            description: 'Hai completato 5 corsi.',
            icon: 'book-open'
        },
        {
            name: 'Cecchino',
            description: 'Hai superato un quiz con il 100% al primo tentativo.',
            icon: 'target'
        },
        {
            name: 'Maratoneta',
            description: 'Hai studiato per più di 10 ore totali.',
            icon: 'clock'
        }
    ]

    for (const badge of badges) {
        const existing = await db.badge.findUnique({
            where: { name: badge.name }
        })

        if (!existing) {
            await db.badge.create({ data: badge })
            console.log(`✅ Created badge: ${badge.name}`)
        } else {
            console.log(`ℹ️ Badge already exists: ${badge.name}`)
        }
    }
}

seedBadges()
    .then(() => process.exit(0))
    .catch(console.error)
