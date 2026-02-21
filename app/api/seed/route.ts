import { db } from "@/lib/db"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const password = await bcrypt.hash("admin123", 10)

        const admin = await db.user.upsert({
            where: { email: "admin@innform.com" },
            update: {},
            create: {
                email: "admin@innform.com",
                name: "Admin User",
                password,
                role: Role.ADMIN,
                isApproved: true
            }
        })

        return NextResponse.json({ success: true, admin })
    } catch (_error) {
        return NextResponse.json({ success: false, error: "Failed to seed" }, { status: 500 })
    }
}
