import { PrismaClient } from '@prisma/client'

const dbUrl = "postgresql://postgres:postgres@localhost:54322/postgres?schema=public"
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
})

async function checkCourses() {
    console.log("Checking courses in 'postgres' database...")
    try {
        const count = await prisma.$queryRaw`SELECT count(*) FROM courses;`
        console.log("Courses count:", count)

        // Check people/users
        const peopleCount = await prisma.$queryRaw`SELECT count(*) FROM people;`
        console.log("People count:", peopleCount)

    } catch (e) {
        console.error("Error checking data:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

checkCourses()
