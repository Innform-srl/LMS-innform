import { db } from '../lib/db'

async function publishContent() {
    console.log('🚀 Publishing course content...\n')

    const courseTitle = 'PRIMO CORSO'

    try {
        const course = await db.course.findFirst({
            where: { title: courseTitle },
            include: { modules: true }
        })

        if (!course) {
            console.log('❌ Course not found')
            return
        }

        // Publish course
        await db.course.update({
            where: { id: course.id },
            data: { published: true }
        })
        console.log(`✅ Course "${course.title}" published`)

        // Publish all modules
        for (const module of course.modules) {
            await db.module.update({
                where: { id: module.id },
                data: { published: true }
            })
            console.log(`✅ Module "${module.title}" published`)
        }

        console.log('\n🎉 All content published successfully!')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

publishContent()
    .then(() => process.exit(0))
    .catch(console.error)
