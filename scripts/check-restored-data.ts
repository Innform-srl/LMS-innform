import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRestoredData() {
    console.log("Checking restored data in current DB...")
    try {
        const userCount = await prisma.user.count()
        const courseCount = await prisma.course.count()
        console.log(`Found ${userCount} users and ${courseCount} courses.`)

        if (userCount > 0) {
            const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true } })
            console.log("Available users:", users)
        }

        if (courseCount > 0) {
            const courses = await prisma.course.findMany({ take: 5, select: { title: true } })
            console.log("Sample courses:", courses.map(c => c.title))
        }
    } catch (e) {
        console.error("Error checking restored data:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkRestoredData()
