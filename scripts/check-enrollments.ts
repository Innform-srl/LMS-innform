import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEnrollments() {
    const email = 'giovanni@innform.com'
    console.log(`Checking enrollments for ${email}...`)
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                enrollments: {
                    include: {
                        course: true
                    }
                }
            }
        })

        if (!user) {
            console.log("User not found!")
            return
        }

        console.log(`User found: ${user.id}`)
        console.log(`Enrollments count: ${user.enrollments.length}`)

        if (user.enrollments.length > 0) {
            console.log("Enrolled courses:", user.enrollments.map(e => e.course.title))
        } else {
            console.log("No enrollments found.")
        }

    } catch (e) {
        console.error("Error checking enrollments:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkEnrollments()
