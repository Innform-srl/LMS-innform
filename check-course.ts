import { db } from "@/lib/db"

async function main() {
    const course = await db.course.findFirst({
        where: { title: "Sicurezza sul Lavoro" }
    })

    if (course) {
        console.log(`Course: ${course.title}`)
        console.log(`ID: ${course.id}`)
        console.log(`Minimum Duration: ${course.minimumDuration}`)
    } else {
        console.log("Course 'Sicurezza sul Lavoro' not found")
    }
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
