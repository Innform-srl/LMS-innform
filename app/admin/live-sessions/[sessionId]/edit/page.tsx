import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLiveSessionById } from "@/app/actions/live-sessions"
import { EditSessionForm } from "./edit-session-form"

export default async function EditLiveSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { sessionId } = await params
    const liveSession = await getLiveSessionById(sessionId)
    if (!liveSession) notFound()

    const courses = await db.course.findMany({
        where: { published: true },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
    })

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-2xl mx-auto">
                <div className="mb-4 text-sm">
                    <Link href="/admin/live-sessions" className="text-muted-foreground hover:text-foreground">
                        Aula Virtuale
                    </Link>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-foreground">{liveSession.title}</span>
                </div>
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl text-foreground">Modifica Sessione</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EditSessionForm session={liveSession} courses={courses} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
