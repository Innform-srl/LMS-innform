import { db } from '../lib/db'

async function publishPrimoCorsoModules() {
    console.log('🔄 Pubblicando moduli di "PRIMO CORSO"...\n')

    const result = await db.module.updateMany({
        where: {
            course: {
                title: {
                    contains: "PRIMO CORSO"
                }
            }
        },
        data: {
            published: true
        }
    })

    console.log(`✅ Pubblicati ${result.count} moduli!`)

    // Verify
    const course = await db.course.findFirst({
        where: { title: { contains: "PRIMO CORSO" } },
        include: {
            modules: {
                orderBy: { position: 'asc' }
            }
        }
    })

    if (course) {
        console.log('\n📋 VERIFICA:')
        console.log('Corso:', course.title)
        console.log('Moduli totali:', course.modules.length)
        course.modules.forEach((mod, i) => {
            console.log(`  ${i + 1}. ${mod.title} - Pubblicato: ${mod.published ? '✅' : '❌'}`)
        })
    }
}

publishPrimoCorsoModules()
    .then(() => process.exit(0))
    .catch(console.error)
