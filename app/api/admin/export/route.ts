import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Parser } from 'json2csv'

export async function GET(req: Request) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'users'

    try {
        let data: Record<string, string | number>[] = []
        let fields: string[] = []

        if (type === 'users') {
            const users = await db.user.findMany({
                where: { role: "EMPLOYEE" },
                include: {
                    _count: {
                        select: {
                            enrollments: true,
                            quizAttempts: true
                        }
                    }
                }
            })

            data = users.map(user => ({
                Name: user.name || '',
                Email: user.email,
                Role: user.role,
                Joined: user.createdAt.toISOString().split('T')[0],
                Enrollments: user._count.enrollments,
                QuizAttempts: user._count.quizAttempts
            }))
            fields = ['Name', 'Email', 'Role', 'Joined', 'Enrollments', 'QuizAttempts']
        } else if (type === 'results') {
            const attempts = await db.quizAttempt.findMany({
                include: {
                    user: { select: { name: true, email: true } },
                    quiz: { select: { title: true } }
                },
                orderBy: { completedAt: 'desc' }
            })

            data = attempts.map(attempt => ({
                User: attempt.user.name || '',
                Email: attempt.user.email,
                Quiz: attempt.quiz.title,
                Score: `${attempt.score}%`,
                Passed: attempt.passed ? 'Yes' : 'No',
                Date: attempt.completedAt.toISOString().split('T')[0]
            }))
            fields = ['User', 'Email', 'Quiz', 'Score', 'Passed', 'Date']
        }

        const parser = new Parser({ fields })
        const csv = parser.parse(data)

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    } catch (error) {
        console.error(error)
        return new Response("Error generating export", { status: 500 })
    }
}
