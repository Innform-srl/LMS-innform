import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function debugLogin() {
    console.log('🔍 Debugging Login for test@innform.com...\n')

    try {
        // 1. Check if user exists
        const user = await db.user.findUnique({
            where: { email: 'test@innform.com' }
        })

        if (!user) {
            console.log('❌ User NOT found in database!')
            return
        }

        console.log('✅ User found:')
        console.log(`   ID: ${user.id}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Password Hash: ${user.password?.substring(0, 10)}...`)

        // 2. Test Password Verification
        const testPassword = 'password'
        const isValid = await bcrypt.compare(testPassword, user.password || '')

        console.log('\n🔐 Password Verification:')
        console.log(`   Input: "${testPassword}"`)
        console.log(`   Match: ${isValid ? '✅ YES' : '❌ NO'}`)

        if (!isValid) {
            console.log('\n⚠️ Password mismatch! Resetting again...')
            const newHash = await bcrypt.hash(testPassword, 10)
            await db.user.update({
                where: { id: user.id },
                data: { password: newHash }
            })
            console.log('✅ Password reset to "password"')

            // Verify again
            const verify = await bcrypt.compare(testPassword, newHash)
            console.log(`   Re-verification: ${verify ? '✅ OK' : '❌ STILL FAILING'}`)
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

debugLogin()
    .then(() => process.exit(0))
    .catch(console.error)
