
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export async function DashboardStats() {
    const session = await auth()
    if (!session?.user) return null

    const enrollments = await db.enrollment.findMany({
        where: { userId: session.user.id },
        select: {
            completed: true,
            timeSpent: true
        }
    })

    const inProgressCount = enrollments.filter(e => !e.completed).length
    const completedCount = enrollments.filter(e => e.completed).length

    // Calculate total study time
    const totalSeconds = enrollments.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass border-border card-hover">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardDescription className="text-muted-foreground">Tempo di Studio</CardDescription>
                            <CardTitle className="text-2xl font-bold text-foreground">
                                {hours}h {minutes}m
                            </CardTitle>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardDescription className="text-muted-foreground">Corsi Iscritti</CardDescription>
                            <CardTitle className="text-4xl font-bold text-primary">{enrollments.length}</CardTitle>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardDescription className="text-muted-foreground">In Corso</CardDescription>
                            <CardTitle className="text-4xl font-bold text-foreground">{inProgressCount}</CardTitle>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardDescription className="text-muted-foreground">Completati</CardDescription>
                            <CardTitle className="text-4xl font-bold text-foreground">{completedCount}</CardTitle>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
