import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function resetEmployeePasswords() {
    const hashedPassword = await bcrypt.hash('password', 10)

    // Reset Mario Rossi
    await db.user.update({
        where: { email: 'mario.rossi@innform.com' },
        data: { password: hashedPassword }
    })

    // Reset Claude
    await db.user.update({
        where: { email: 'claude@innform.com' },
        data: { password: hashedPassword }
    })

    console.log('✅ Employee passwords reset to "password"')
    console.log('- mario.rossi@innform.com / password')
    console.log('- claude@innform.com / password')
}

resetEmployeePasswords()
    .then(() => process.exit(0))
    .catch(console.error)
