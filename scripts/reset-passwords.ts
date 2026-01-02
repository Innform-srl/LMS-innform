import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔐 Resetting passwords...\n')

    const newPassword = 'admin123'
    const hashedPassword = await hash(newPassword, 10)

    // Update admin
    await prisma.user.update({
        where: { email: 'admin@innform.com' },
        data: { password: hashedPassword }
    })
    console.log('✅ Password aggiornata per: admin@innform.com')

    // Update test user
    await prisma.user.update({
        where: { email: 'test@innform.com' },
        data: { password: hashedPassword }
    })
    console.log('✅ Password aggiornata per: test@innform.com')

    console.log('\n🎉 Fatto! Ora prova a fare login con:')
    console.log('   Email: test@innform.com')
    console.log('   Password: admin123')
    console.log('\n   oppure')
    console.log('\n   Email: admin@innform.com')
    console.log('   Password: admin123')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
