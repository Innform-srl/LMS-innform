import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCourseStatus() {
    console.log("Checking course status...")
    try {
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                published: true,
                companyId: true,
                departmentId: true
            }
        })
        console.log("Courses found:", courses)
    } catch (e) {
        console.error("Error checking course status:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkCourseStatus()
