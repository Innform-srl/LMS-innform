// Test script to manually add time to enrollment
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'test@innform.com' // Change if needed

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log('❌ User not found')
        return
    }

    // Find all enrollments for this user
    const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id },
        include: {
            course: {
                select: {
                    title: true,
                    minimumDuration: true
                }
            }
        }
    })

    console.log(`\n📚 Enrollments for ${email}:\n`)

    for (const enrollment of enrollments) {
        console.log(`Course: ${enrollment.course.title}`)
        console.log(`  Current time: ${enrollment.timeSpent} minutes`)
        console.log(`  Required: ${enrollment.course.minimumDuration} minutes`)
        console.log(`  Progress: ${Math.round((enrollment.timeSpent / enrollment.course.minimumDuration) * 100)}%`)

        // Add 5 minutes for testing
        await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
                timeSpent: { increment: 5 }
            }
        })
        console.log(`  ✅ Added 5 minutes (now: ${enrollment.timeSpent + 5} minutes)\n`)
    }

    console.log('🎉 Ricarica la pagina del corso per vedere il cambiamento!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
