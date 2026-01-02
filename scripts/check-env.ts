import { config } from 'dotenv'
config()

if (process.env.AUTH_SECRET) {
    console.log("✅ AUTH_SECRET is present")
} else {
    console.log("❌ AUTH_SECRET is MISSING")
}
