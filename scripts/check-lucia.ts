import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function checkUser() {
  const email = 'lucia.bibbo@tiscali.it'
  const testPassword = 'TestArmando2026!'

  console.log('🔍 Checking user:', email)

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      isApproved: true,
      approvedAt: true,
      createdAt: true,
    }
  })

  if (!user) {
    console.log('❌ User NOT FOUND in database')
    await db.$disconnect()
    return
  }

  console.log('\n✅ User found:')
  console.log('  ID:', user.id)
  console.log('  Email:', user.email)
  console.log('  Name:', user.name)
  console.log('  Role:', user.role)
  console.log('  isApproved:', user.isApproved)
  console.log('  approvedAt:', user.approvedAt)
  console.log('  createdAt:', user.createdAt)
  console.log('  Has password:', !!user.password)

  if (user.password) {
    const match = await bcrypt.compare(testPassword, user.password)
    console.log('\n🔐 Password test:', match ? '✅ MATCH' : '❌ NO MATCH')
  }

  console.log('\n🚦 Can login:', user.isApproved && user.password ? '✅ YES' : '❌ NO')

  await db.$disconnect()
}

checkUser().catch(console.error)
