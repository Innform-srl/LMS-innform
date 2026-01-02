
import { db } from "@/lib/db"

async function main() {
    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company: {
                    select: {
                        name: true
                    }
                }
            }
        })
        console.log(JSON.stringify(users, null, 2))
    } catch (error) {
        console.error("Error fetching users:", error)
    }
}

main()
