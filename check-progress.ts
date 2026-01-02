import { db } from "./lib/db"

async function checkProgress() {
    const users = await db.user.findMany()
    console.log(`Checking progress for ${users.length} users...`)

    for (const user of users) {
        const enrollments = await db.enrollment.findMany({
            where: {
                userId: user.id,
                course: { title: { contains: "Privacy" } }
            },
            include: { course: { include: { modules: true } } }
        })

        if (enrollments.length === 0) continue

        console.log(`\nUser: ${user.email} (${user.name})`)

        for (const enrollment of enrollments) {
            console.log(`Course: ${enrollment.course.title}`)
            console.log(`Progress: ${enrollment.progress}%`)
            console.log(`Time Spent: ${enrollment.timeSpent}s`)
            console.log(`Completed: ${enrollment.completed}`)

            const modules = enrollment.course.modules
            const progress = await db.moduleProgress.findMany({
                where: {
                    userId: user.id,
                    moduleId: { in: modules.map(m => m.id) }
                }
            })

            console.log(`Total Modules: ${modules.length}`)
            const statusList = modules.map((m, i) => {
                const p = progress.find(mp => mp.moduleId === m.id)
                return `${i + 1}. ${m.title} [${m.contentType || 'Video'}]: ${p?.completed ? "YES" : "NO"}`
            })
            console.log(statusList.join("\n"))
        }
    }
}

checkProgress()
