import { PrismaClient } from '@prisma/client'

// Connect to 'lms_innform' database instead of 'postgres'
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:postgres@localhost:54322/lms_innform?schema=public"
        }
    }
})

async function checkLmsInnformDB() {
    console.log("Checking lms_innform database on port 54322...")
    try {
        const userCount = await prisma.user.count()
        const courseCount = await prisma.course.count()
        console.log(`\nFound ${userCount} users and ${courseCount} courses in lms_innform DB.`)

        // Check if the app user exists here
        const appUser = await prisma.user.findUnique({
            where: { id: 'cmioan67y0000we8fzk2ad70q' }
        })
        console.log("\nApp user exists in lms_innform DB?", !!appUser)
        if (appUser) {
            console.log("App user:", appUser.email)
        }

    } catch (e) {
        console.error("Error:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

checkLmsInnformDB()
