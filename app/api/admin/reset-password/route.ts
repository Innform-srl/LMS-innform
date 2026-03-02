import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available' }, { status: 404 })
    }

    try {
        const hashedPassword = await bcrypt.hash("admin", 10)
        const email = "admin@innform.com"

        await db.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: "ADMIN",
                isApproved: true
            },
            create: {
                email,
                name: "Admin User",
                password: hashedPassword,
                role: "ADMIN",
                isApproved: true
            }
        })

        return NextResponse.json({ success: true, message: "Admin password reset to 'admin'" })
    } catch (error) {
        console.error("Reset password error:", error)
        return NextResponse.json({ success: false, error: "Failed to reset password" }, { status: 500 })
    }
}
