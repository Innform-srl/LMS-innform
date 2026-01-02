import { db } from "@/lib/db"

async function main() {
    const user = await db.user.findUnique({
        where: { email: "admin@innform.com" }
    })

    if (!user) {
        console.log("User not found")
        return
    }

    const enrollments = await db.enrollment.findMany({
        where: { userId: user.id },
        include: { course: true }
    })

    console.log("Enrollments for admin@innform.com:")
    enrollments.forEach(e => {
        console.log(`Enrollment ID: ${e.id}`)
        console.log(`TimeSpent: ${e.timeSpent}`)
        console.log(`Has timeSpent property: ${'timeSpent' in e}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect())
