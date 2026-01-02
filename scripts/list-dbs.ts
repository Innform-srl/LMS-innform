import { PrismaClient } from '@prisma/client'

const dbUrl = "postgresql://postgres:postgres@localhost:54322/postgres?schema=public"
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
})

async function listDatabases() {
    console.log("Listing databases...")
    try {
        const result = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false;`
        console.log("Databases:", result)
    } catch (e) {
        console.error("Error listing databases:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

listDatabases()
