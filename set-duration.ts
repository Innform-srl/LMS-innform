import { db } from "@/lib/db"

async function main() {
    // Update the first course found to have 60 mins duration
    const course = await db.course.findFirst()
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
