import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function resetCredentials() {
    console.log('🔄 Resetting admin and employee credentials...\n')

    // Hash standard password
    const password = 'password'
    const hashedPassword = await bcrypt.hash(password, 12)

    // 1. Reset/Create Admin
    const admin = await db.user.upsert({
        where: { email: 'admin@innform.com' },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Admin INNFORM',
        },
        create: {
            email: 'admin@innform.com',
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Admin INNFORM',
        },
    })

    console.log('✅ Admin:', admin.email)

    // 2. Reset/Create Test Employee
    const employee = await db.user.upsert({
        where: { email: 'test@innform.com' },
        update: {
            password: hashedPassword,
            role: 'EMPLOYEE',
            name: 'Test Employee',
        },
        create: {
            email: 'test@innform.com',
            password: hashedPassword,
            role: 'EMPLOYEE',
            name: 'Test Employee',
        },
    })

    console.log('✅ Employee:', employee.email)

    console.log('\n📋 CREDENTIALS:')
    console.log('================')
    console.log('Admin:')
    console.log('  Email: admin@innform.com')
    console.log('  Password: password')
    console.log('')
    console.log('Employee:')
    console.log('  Email: test@innform.com')
    console.log('  Password: password')
    console.log('================')
}

resetCredentials()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
