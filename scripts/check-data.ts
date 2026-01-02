
import { config } from 'dotenv'
config()
import { db } from "@/lib/db"

async function main() {
    const companies = await db.company.findMany({ include: { _count: { select: { users: true } } } })
    const departments = await db.department.findMany({ include: { _count: { select: { users: true } } } })
    const users = await db.user.findMany({
        select: { id: true, name: true, email: true, role: true }
    })

    console.log("Companies:", companies)
    console.log("Departments:", departments)
    console.log("Users:", users)
}

main()
