import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const users = await db.user.findMany({
            include: {
                department: true,
                moduleProgress: {
                    select: { watchedSeconds: true }
                },
                enrollments: {
                    include: { course: { select: { title: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // CSV Header
        const header = ['ID', 'Nome', 'Email', 'Ruolo', 'Dipartimento', 'Tempo Totale (min)', 'Corsi Iscritti', 'Data Iscrizione']

        // CSV Rows
        const rows = users.map(user => {
            const totalSeconds = user.moduleProgress.reduce((acc, curr) => acc + curr.watchedSeconds, 0)
            const totalMinutes = Math.round(totalSeconds / 60)
            const courses = user.enrollments.map(e => e.course.title).join('; ')

            return [
                user.id,
                user.name || '',
                user.email,
                user.role,
                user.department?.name || '',
                totalMinutes,
                `"${courses}"`, // Quote to handle potential commas in titles
                user.createdAt.toISOString().split('T')[0]
            ].join(',')
        })

        const csvContent = [header.join(','), ...rows].join('\n')

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })

    } catch (error) {
        console.error("[EXPORT_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
