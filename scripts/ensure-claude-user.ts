import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'claude@innform.com'

    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { contains: 'claude', mode: 'insensitive' } },
                { name: { contains: 'claude', mode: 'insensitive' } }
            ]
        }
    })

    if (!user) {
        console.log('User Claude not found. Creating...')
        const hashedPassword = await bcrypt.hash('password', 10)
        user = await prisma.user.create({
            data: {
                email: email,
                name: 'Claude AI',
                password: hashedPassword,
                role: 'EMPLOYEE'
            }
        })
        console.log(`✅ Created user: ${user.name} (${user.email})`)
    } else {
        console.log(`👤 Found user: ${user.name} (${user.email})`)
        // Ensure password is known (resetting to 'password' for testing)
        const hashedPassword = await bcrypt.hash('password', 10)
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        })
        console.log('🔑 Password reset to "password"')
    }

    console.log(`\nLogin credentials:`)
    console.log(`Email: ${user.email}`)
    console.log(`Password: password`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
