import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function resetPassword() {
  const email = 'fedeabru@yahoo.it'
  const newPassword = 'TestFede2026!'

  console.log('🔐 Resetting password for:', email)

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Update user
  const user = await db.user.update({
    where: { email },
    data: { password: hashedPassword },
    select: { id: true, email: true, name: true }
  })

  console.log('✅ Password reset successfully for:', user.email)
  console.log('   User ID:', user.id)
  console.log('   New password:', newPassword)

  // Verify it works
  const verifyUser = await db.user.findUnique({
    where: { email },
    select: { password: true }
  })

  if (verifyUser?.password) {
    const match = await bcrypt.compare(newPassword, verifyUser.password)
    console.log('\n🔍 Verification:', match ? '✅ Password works!' : '❌ Still not working')
  }

  await db.$disconnect()
}

resetPassword().catch(console.error)
