import { config } from 'dotenv'
config()
import { db } from '../lib/db'

async function diagnose() {
    console.log("--- Diagnostic Start ---")

    // 1. Check Env Vars
    const dbUrl = process.env.DATABASE_URL
    const authSecret = process.env.AUTH_SECRET

    console.log("DATABASE_URL present:", !!dbUrl)
    if (dbUrl) {
        // Mask password
        const masked = dbUrl.replace(/:([^:@]+)@/, ':****@')
        console.log("DATABASE_URL value:", masked)
    }

    console.log("AUTH_SECRET present:", !!authSecret)

    // 2. Check DB Connection
    try {
        console.log("Attempting DB connection...")
        const userCount = await db.user.count()
        console.log("DB Connection successful. User count:", userCount)

        // 3. Check Admin User
        const adminEmail = 'admin@innform.com'
        const admin = await db.user.findUnique({
            where: { email: adminEmail }
        })

        if (admin) {
            console.log("Admin user found:", admin.email)
            console.log("Admin role:", admin.role)
            console.log("Admin isApproved:", admin.isApproved)
            console.log("Admin password hash length:", admin.password?.length)
        } else {
            console.log("Admin user NOT found")
        }

    } catch (error: any) {
        console.error("DB Connection Failed:", error.message)
        if (error.code) console.error("Error Code:", error.code)
    }

    console.log("--- Diagnostic End ---")
}

diagnose()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
