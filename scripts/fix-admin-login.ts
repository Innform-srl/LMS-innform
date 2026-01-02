import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAndResetAdmin() {
    const email = 'admin@innform.com'
    const newPassword = 'password123'

    console.log(`\n🔍 Checking admin account: ${email}`)

    try {
        // Find the admin user
        const admin = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                isApproved: true
            }
        })

        if (!admin) {
            console.log(`❌ Admin not found with email: ${email}`)
            console.log(`\nLet me check all admin users:`)
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true, email: true, name: true, isApproved: true }
            })
            console.log(admins)
            return
        }

        console.log(`✅ Admin found!`)
        console.log(`   Name: ${admin.name}`)
        console.log(`   Email: ${admin.email}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Approved: ${admin.isApproved}`)
        console.log(`   Has password: ${!!admin.password}`)

        // Reset password
        console.log(`\n🔐 Resetting password to: ${newPassword}`)
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                isApproved: true  // Ensure user is approved
            }
        })

        console.log(`✅ Password updated successfully!`)

        // Verify the new password works
        const updatedAdmin = await prisma.user.findUnique({
            where: { email },
            select: { password: true }
        })

        if (updatedAdmin?.password) {
            const isValid = await bcrypt.compare(newPassword, updatedAdmin.password)
            console.log(`\n🔑 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
        }

        console.log(`\n📋 Login credentials:`)
        console.log(`   Email: ${email}`)
        console.log(`   Password: ${newPassword}`)

    } catch (e) {
        console.error("❌ Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkAndResetAdmin()
