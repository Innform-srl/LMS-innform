import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Check existing users
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true
        }
    })

    console.log('👥 Utenti nel database:')
    if (users.length === 0) {
        console.log('❌ NESSUN UTENTE TROVATO!')
        console.log('\n🔧 Creo utenti di default...\n')

        const hashedPassword = await hash('admin123', 10)

        // Create admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@innform.com',
                name: 'Admin INNFORM',
                password: hashedPassword,
                role: 'ADMIN',
            }
        })
        console.log('✅ Creato:', admin.email, '/', 'admin123')

        // Create test user
        const test = await prisma.user.create({
            data: {
                email: 'test@innform.com',
                name: 'Test Employee',
                password: hashedPassword,
                role: 'EMPLOYEE',
            }
        })
        console.log('✅ Creato:', test.email, '/', 'admin123')

    } else {
        users.forEach(u => {
            console.log(`- ${u.email} (${u.role})`)
        })
        console.log('\n✅ Gli utenti esistono. Password dovrebbe essere: admin123')
        console.log('\n💡 Se il login non funziona, potrebbe essere un problema di hashing.')
        console.log('   Prova a rifare il seed completo con: npx prisma db seed')
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
