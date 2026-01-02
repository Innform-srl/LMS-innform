import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdminUsers() {
    console.log("Checking admin users in database...")

    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: {
                id: true,
                email: true,
                password: true,
                isApproved: true,
                _count: {
                    select: { enrollments: true }
                }
            }
        })

        console.log(`\nFound ${admins.length} admin users:`)
        admins.forEach(admin => {
            console.log(`\n- Email: ${admin.email}`)
            console.log(`  ID: ${admin.id}`)
            console.log(`  Approved: ${admin.isApproved}`)
            console.log(`  Has password: ${!!admin.password}`)
            console.log(`  Enrollments: ${admin._count.enrollments}`)
        })

    } catch (e) {
        console.error("Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkAdminUsers()
