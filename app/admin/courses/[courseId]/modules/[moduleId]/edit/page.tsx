import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EditModuleForm } from "./edit-module-form"

export default async function EditModulePage({
    params
}: {
    params: Promise<{ courseId: string, moduleId: string }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { courseId, moduleId } = await params

    const module = await db.module.findUnique({
        where: { id: moduleId },
        include: {
            course: {
                select: {
                    id: true,
                    title: true
                }
            },
            liveSession: true
        }
    })

    if (!module || module.courseId !== courseId) {
        redirect(`/admin/courses/${courseId}`)
    }

    // Fetch available live sessions not already linked to other modules
    let availableSessions: any[] = []
    try {
        availableSessions = await db.liveSession.findMany({
            where: {
                OR: [
                    { module: { is: null } },
                    { id: module.liveSessionId ?? undefined }
                ]
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                meetingUrl: true,
            }
        })
    } catch (error) {
        console.error("Error fetching available sessions:", error)
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Modifica Modulo</h1>
                    <p className="text-muted-foreground">Corso: {module.course.title}</p>
                </div>

                <EditModuleForm module={JSON.parse(JSON.stringify(module))} courseId={courseId} availableSessions={JSON.parse(JSON.stringify(availableSessions))} />
            </div>
        </div>
    )
}
