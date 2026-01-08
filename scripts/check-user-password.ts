import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function checkUser() {
  const email = 'fedeabru@yahoo.it' // lowercase come salvato nel DB
  const testPassword = 'TestFede2026!'

  console.log('🔍 Checking user:', email)

  const user = await db.user.findUnique({
    where: { email },
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

    // Try uppercase
    const userUpper = await db.user.findUnique({
      where: { email: 'FEDEABRU@YAHOO.IT' },
    })
    if (userUpper) {
      console.log('⚠️ User found with UPPERCASE email!')
    }

    // List all users with similar email
    const similar = await db.user.findMany({
      where: { email: { contains: 'fedeabru', mode: 'insensitive' } },
      select: { id: true, email: true, name: true }
    })
    console.log('Similar users:', similar)

    process.exit(1)
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
  console.log('  Password hash (first 20 chars):', user.password?.substring(0, 20))

  if (!user.password) {
    console.log('\n❌ USER HAS NO PASSWORD!')
    process.exit(1)
  }

  // Test password
  console.log('\n🔐 Testing password:', testPassword)
  const match = await bcrypt.compare(testPassword, user.password)
  console.log('  Password match:', match ? '✅ YES' : '❌ NO')

  if (!match) {
    // Try hashing the password and comparing hashes
    console.log('\n📝 Debug info:')
    console.log('  Stored hash:', user.password)
    const newHash = await bcrypt.hash(testPassword, 10)
    console.log('  New hash of same password:', newHash)
    console.log('  (Hashes will differ due to random salt, but bcrypt.compare should still work)')
  }

  // Check if user can login
  console.log('\n🚦 Login check:')
  console.log('  isApproved:', user.isApproved ? '✅' : '❌ BLOCKED')

  if (!user.isApproved) {
    console.log('  ⚠️ User is NOT approved - login will fail!')
  }

  await db.$disconnect()
}

checkUser().catch(console.error)
