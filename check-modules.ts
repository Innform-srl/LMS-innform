import { db } from "./lib/db"

async function checkModules() {
    try {
        const course = await db.course.findFirst({
            include: {
                modules: true
            }
        })

        if (!course) {
            console.log("No course found")
            return
        }

        console.log(`Course: ${course.title}`)
        console.log("Modules:")
        course.modules.forEach(m => {
            console.log(`- ${m.title}: videoUrl="${m.videoUrl}"`)
        })

    } catch (error) {
        console.error("Error:", error)
    }
}

checkModules()
