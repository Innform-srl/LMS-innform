import { db } from '../lib/db'

async function checkProgress() {
    console.log('🔍 Checking Module Progress...\n')

    const progress = await db.moduleProgress.findMany({
        include: {
            user: {
                select: { email: true }
            },
            module: {
                select: { title: true }
            }
        }
    })

    if (progress.length === 0) {
        console.log('❌ No progress found in database.')
    } else {
        console.log(`✅ Found ${progress.length} progress records:`)
        progress.forEach(p => {
            console.log(`- User: ${p.user.email}`)
            console.log(`  Module: ${p.module.title}`)
            console.log(`  Watched Seconds: ${p.watchedSeconds}`)
            console.log(`  Completed: ${p.completed}`)
            console.log('---')
        })
    }
}

checkProgress()
    .then(() => process.exit(0))
    .catch(console.error)
