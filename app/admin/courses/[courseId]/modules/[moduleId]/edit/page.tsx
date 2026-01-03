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
    if (session?.user?.role !== "ADMIN") redirect("/")

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

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Modifica Modulo</h1>
                    <p className="text-muted-foreground">Corso: {module.course.title}</p>
                </div>

                <EditModuleForm module={module} courseId={courseId} />
            </div>
        </div>
    )
}
