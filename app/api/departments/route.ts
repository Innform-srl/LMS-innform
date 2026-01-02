import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const departments = await db.department.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })

        return NextResponse.json(departments)
    } catch (error) {
        console.error('Error fetching departments:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
