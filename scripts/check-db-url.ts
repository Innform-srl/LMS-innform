import { config } from 'dotenv'
config()

const url = process.env.DATABASE_URL
if (url) {
    // Mask password
    const masked = url.replace(/:([^:@]+)@/, ':****@')
    console.log(`Configured DATABASE_URL: ${masked}`)
} else {
    console.log("DATABASE_URL is not set")
}
