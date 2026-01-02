import { db } from '../lib/db'

/**
 * Script per aggiungere video URL a moduli esistenti
 * Modifica courseTitle e videoUrls array secondo necessità
 */

async function addVideosToModules() {
    console.log('🎥 Adding videos to course modules...\n')

    const courseTitle = 'PRIMO CORSO'  // <-- MODIFICA QUI

    // Video URLs per ogni modulo (ordine sequenziale)
    const videoUrls = [
        {
            url: 'https://www.youtube.com/watch?v=RK1K2bCg4J8',
            duration: 300  // 5 minuti
        },
        {
            url: 'https://www.youtube.com/watch?v=kBXQZMmiA4s',
            duration: 420  // 7 minuti
        }
        // Aggiungi più video se hai più moduli
    ]

    try {
        // Trova il corso
        const course = await db.course.findFirst({
            where: { title: { contains: courseTitle } },
            include: {
                modules: {
                    orderBy: { position: 'asc' }
                }
            }
        })

        if (!course) {
            console.log(`❌ Corso "${courseTitle}" non trovato`)
            return
        }

        console.log(`✅ Trovato corso: ${course.title}`)
        console.log(`   Moduli: ${course.modules.length}\n`)

        // Aggiorna ogni modulo
        for (let i = 0; i < course.modules.length; i++) {
            const module = course.modules[i]
            const videoData = videoUrls[i]

            if (!videoData) {
                console.log(`⚠️  Modulo ${i + 1}: ${module.title} - Nessun video URL disponibile`)
                continue
            }

            await db.module.update({
                where: { id: module.id },
                data: {
                    videoUrl: videoData.url,
                    videoDuration: videoData.duration
                }
            })

            console.log(`✅ Modulo ${i + 1}: ${module.title}`)
            console.log(`   Video: ${videoData.url}`)
            console.log(`   Durata: ${videoData.duration}s\n`)
        }

        console.log('🎉 Completato! Video aggiunti con successo.')
        console.log(`\n📝 Prossimi step:`)
        console.log(`   1. Verifica video su http://localhost:3005/courses/${course.id}`)
        console.log(`   2. Aggiungi quiz se mancante`)
        console.log(`   3. Pubblica il corso`)

    } catch (error) {
        console.error('❌ Errore:', error)
        process.exit(1)
    }
}

addVideosToModules()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
