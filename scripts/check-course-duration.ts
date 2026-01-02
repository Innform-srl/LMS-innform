import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const courses = await prisma.course.findMany({
        select: {
            id: true,
            title: true,
            minimumDuration: true
        }
    })

    console.log('Corsi e durata minima (in minuti):')
    courses.forEach(c => {
        const hours = Math.floor(c.minimumDuration / 60)
        const minutes = c.minimumDuration % 60
        console.log(`- ${c.title}: ${c.minimumDuration} minuti (${hours}h ${minutes}m)`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
