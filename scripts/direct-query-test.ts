import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})

async function testDirectQuery() {
    console.log("Testing direct query...")
    console.log("DATABASE_URL:", process.env.DATABASE_URL)

    try {
        const userCount = await prisma.user.count()
        const courseCount = await prisma.course.count()
        console.log(`\nFound ${userCount} users and ${courseCount} courses.`)

        // Check if the user from the app exists
        const appUser = await prisma.user.findUnique({
            where: { id: 'cmioan67y0000we8fzk2ad70q' }
        })
        console.log("\nApp user exists in this DB?", !!appUser)
        if (appUser) {
            console.log("App user:", appUser.email)
        }

        // Check for restored users
        const restoredUser = await prisma.user.findUnique({
            where: { id: 'cmihpabkl000013aejxuv2676' }
        })
        console.log("\nRestored user exists in this DB?", !!restoredUser)
        if (restoredUser) {
            console.log("Restored user:", restoredUser.email)
        }

    } catch (e) {
        console.error("Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

testDirectQuery()
