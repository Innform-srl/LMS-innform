import { PrismaClient } from '@prisma/client'

const dbUrl = "postgresql://postgres:postgres@localhost:54322/postgres?schema=public"
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
})

async function checkOldData() {
    console.log("Checking data in 'postgres' database...")
    try {
        const userCount = await prisma.user.count()
        const courseCount = await prisma.course.count()
        console.log(`Found ${userCount} users and ${courseCount} courses.`)

        if (userCount > 0) {
            const users = await prisma.user.findMany({ take: 5, select: { email: true } })
            console.log("Sample users:", users.map(u => u.email))
        }
    } catch (e) {
        console.error("Error checking old data:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

checkOldData()
