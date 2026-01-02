import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function debugAdminLogin() {
    console.log('🔍 Debugging Admin Login...\n')

    const email = 'admin@innform.com'
    const password = 'password'

    try {
        // 1. Find user
        const user = await db.user.findUnique({
            where: { email }
        })

        if (!user) {
            console.log('❌ User not found in database!')
            return
        }

        console.log(`✅ User found: ${user.name} (${user.email})`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Stored Hash: ${user.password?.substring(0, 10)}...`)

        // 2. Compare password
        const isValid = await bcrypt.compare(password, user.password || '')
        console.log(`   Password 'password' match: ${isValid ? '✅ YES' : '❌ NO'}`)

        if (!isValid) {
            console.log('\n⚠️ Password mismatch. Resetting password to "password"...')
            const hashedPassword = await bcrypt.hash(password, 10)
            await db.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            })
            console.log('✅ Password reset complete.')

            // Verify again
            const newIsValid = await bcrypt.compare(password, hashedPassword)
            console.log(`   Re-verification match: ${newIsValid ? '✅ YES' : '❌ NO'}`)
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

debugAdminLogin()
    .then(() => process.exit(0))
    .catch(console.error)
