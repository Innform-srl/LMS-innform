import { db } from "./lib/db"

async function checkPrisma() {
    try {
        console.log("Checking Prisma Client...")
        // @ts-ignore
        if (db.courseRating) {
            console.log("✅ db.courseRating exists")
            const count = await db.courseRating.count()
            console.log(`Count: ${count}`)
        } else {
            console.log("❌ db.courseRating is UNDEFINED")
        }
    } catch (error) {
        console.error("Error:", error)
    }
}

checkPrisma()
