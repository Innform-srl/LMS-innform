import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enrollAdminInAllCourses() {
    const adminId = 'cmioan67y0000we8fzk2ad70q'

    console.log("Enrolling admin in all published courses...")

    try {
        // Get all published courses
        const courses = await prisma.course.findMany({
            where: { published: true },
            select: { id: true, title: true }
        })

        console.log(`Found ${courses.length} published courses`)

        // Create enrollments for each course
        for (const course of courses) {
            try {
                await prisma.enrollment.create({
                    data: {
                        userId: adminId,
                        courseId: course.id,
                        progress: 0,
                        completed: false
                    }
                })
                console.log(`✓ Enrolled in: ${course.title}`)
            } catch (e: any) {
                if (e.code === 'P2002') {
                    console.log(`⚠ Already enrolled in: ${course.title}`)
                } else {
                    console.error(`✗ Error enrolling in ${course.title}:`, e.message)
                }
            }
        }

        console.log("\n✅ Done!")

    } catch (e) {
        console.error("Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

enrollAdminInAllCourses()
