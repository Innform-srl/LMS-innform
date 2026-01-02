import { PrismaClient } from '@prisma/client'

const dbUrl = "postgresql://postgres:password@localhost:5432/lms_innform"
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
})

async function checkLocalData() {
    console.log("Checking data in 'lms_postgres' (port 5432)...")
    try {
        const userCount = await prisma.user.count()
        const courseCount = await prisma.course.count()
        console.log(`Found ${userCount} users and ${courseCount} courses.`)

        if (courseCount > 0) {
            const courses = await prisma.course.findMany({ take: 5, select: { title: true } })
            console.log("Sample courses:", courses.map(c => c.title))
        }
    } catch (e) {
        console.error("Error checking local data:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

checkLocalData()
