import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const departments = await db.department.findMany({
            include: {
                users: {
                    select: {
                        enrollments: {
                            select: {
                                progress: true,
                                completed: true
                            }
                        }
                    }
                }
            }
        })

        const data = departments.map(dept => {
            let totalProgress = 0
            let totalEnrollments = 0
            let completedCount = 0

            dept.users.forEach(user => {
                user.enrollments.forEach(enrollment => {
                    totalProgress += enrollment.progress
                    totalEnrollments++
                    if (enrollment.completed) completedCount++
                })
            })

            return {
                name: dept.name,
                avgProgress: totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0,
                completed: completedCount,
                totalEnrollments
            }
        })

        return NextResponse.json(data)
    } catch (error) {
        console.error('Analytics department error:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
