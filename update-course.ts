import { db } from "@/lib/db"

async function main() {
    const course = await db.course.findFirst({
        where: { title: "Sicurezza sul Lavoro" }
    })

    if (course) {
        await db.course.update({
            where: { id: course.id },
            data: { minimumDuration: 60 }
        })
        console.log(`Updated course ${course.title} duration to 60 mins`)
    }
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
