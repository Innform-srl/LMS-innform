import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function test() {
  const user = await db.user.findUnique({
    where: { email: 'lucia.bibbo@tiscali.it' },
    select: { password: true }
  })

  if (user?.password) {
    const match = await bcrypt.compare('armando', user.password)
    console.log('Password "armando" match:', match ? '✅ YES!' : '❌ NO')
  }

  await db.$disconnect()
}

test().catch(console.error)
