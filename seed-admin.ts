
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
    try {
        const password = await bcrypt.hash("admin123", 10)

        const admin = await db.user.upsert({
            where: { email: "admin@innform.com" },
            update: {
                isApproved: true,
                password: password // Update password just in case
            },
            create: {
                email: "admin@innform.com",
                name: "Admin User",
                password,
                role: "ADMIN",
                isApproved: true,
            },
        })

        console.log("Admin user seeded and approved:", admin)
    } catch (error) {
        console.error("Error seeding admin:", error)
    } finally {
        await db.$disconnect()
    }
}

main()
