import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function reset() {
  const email = 'lucia.bibbo@tiscali.it'
  const newPassword = 'armando'

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await db.user.update({
    where: { email },
    data: { password: hashedPassword }
  })

  console.log('✅ Password reset to "armando" for', email)

  // Verify
  const user = await db.user.findUnique({
    where: { email },
    select: { password: true }
  })

  if (user?.password) {
    const match = await bcrypt.compare(newPassword, user.password)
    console.log('Verification:', match ? '✅ OK' : '❌ FAILED')
  }

  await db.$disconnect()
}

reset().catch(console.error)
