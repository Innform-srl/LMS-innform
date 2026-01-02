import { db } from '../lib/db'

async function publishCourseModules() {
    const result = await db.module.updateMany({
        where: {
            course: {
                title: {
                    contains: "COMPETENZE DIGITALI"
                }
            }
        },
        data: {
            published: true
        }
    })

    console.log(`✅ Pubblicati ${result.count} moduli!`)
}

publishCourseModules()
    .then(() => process.exit(0))
    .catch(console.error)
