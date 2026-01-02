import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function resetAdmin() {
    console.log('🔧 Resetting Admin Credentials...\n')

    try {
        const hashedPassword = await bcrypt.hash('password', 10)

        // Check if admin exists
        const admin = await db.user.findUnique({
            where: { email: 'admin@innform.com' }
        })

        if (admin) {
            await db.user.update({
                where: { email: 'admin@innform.com' },
                data: {
                    password: hashedPassword,
                    role: 'ADMIN' // Ensure role is ADMIN
                }
            })
            console.log('✅ Admin password reset to "password"')
        } else {
            await db.user.create({
                data: {
                    email: 'admin@innform.com',
                    name: 'Admin User',
                    password: hashedPassword,
                    role: 'ADMIN'
                }
            })
            console.log('✅ Admin user created with password "password"')
        }

        console.log('\n🔑 Admin Credentials:')
        console.log('   Email: admin@innform.com')
        console.log('   Password: password')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

resetAdmin()
    .then(() => process.exit(0))
    .catch(console.error)
