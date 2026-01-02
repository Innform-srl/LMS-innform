import { config } from 'dotenv'
config()
import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function resetAdminPassword() {
    const hashedPassword = await bcrypt.hash('admin', 10)
    const email = 'admin@innform.com'

    console.log(`Resetting password for ${email}...`)

    const user = await db.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            isApproved: true
        },
        create: {
            email,
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            isApproved: true
        }
    })

    console.log(`✅ Admin user configured: ${email} / admin`)
}

resetAdminPassword()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
