import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const enrollments = await db.enrollment.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo }
            },
            select: {
                createdAt: true,
                completedAt: true
            }
        })

        // Group by date
        const timeline = new Map<string, { date: string, enrollments: number, completions: number }>()

        // Initialize last 30 days
        for (let i = 0; i < 30; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            timeline.set(dateStr, { date: dateStr, enrollments: 0, completions: 0 })
        }

        enrollments.forEach(e => {
            const dateStr = e.createdAt.toISOString().split('T')[0]
            if (timeline.has(dateStr)) {
                timeline.get(dateStr)!.enrollments++
            }

            if (e.completedAt) {
                const completeDateStr = e.completedAt.toISOString().split('T')[0]
                if (timeline.has(completeDateStr)) {
                    timeline.get(completeDateStr)!.completions++
                }
            }
        })

        const data = Array.from(timeline.values()).sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json(data)
    } catch (error) {
        console.error('Analytics timeline error:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
