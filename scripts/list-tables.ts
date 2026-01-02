import { PrismaClient } from '@prisma/client'

const dbUrl = "postgresql://postgres:postgres@localhost:54322/postgres?schema=public"
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
})

async function listTables() {
    console.log("Listing tables in 'postgres' database...")
    try {
        const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
        console.log("Tables:", result)
    } catch (e) {
        console.error("Error listing tables:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

listTables()
