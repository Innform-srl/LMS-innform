import { db } from "@/lib/db"

async function checkAdmin() {
    const admin = await db.user.findUnique({
        where: { email: "admin@innform.com" }
    })
    console.log("Admin user:", admin)
}

checkAdmin()
