import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword() {
    const email = 'admin@innform.com'
    const newPassword = 'password'

    console.log(`Resetting password for ${email}...`)

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        })

        console.log(`✅ Password reset successfully!`)
        console.log(`\nCredentials:`)
        console.log(`Email: ${email}`)
        console.log(`Password: ${newPassword}`)

    } catch (e) {
        console.error("Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

resetAdminPassword()
