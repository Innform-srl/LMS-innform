// Reset quiz attempts for a user
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'test@innform.com' // Change if needed

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log('❌ User not found')
        return
    }

    // Delete all quiz attempts for this user
    const deleted = await prisma.quizAttempt.deleteMany({
        where: { userId: user.id }
    })

    console.log(`✅ Deleted ${deleted.count} quiz attempts for ${email}`)
    console.log('🎉 Ora puoi rifare tutti i quiz!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
