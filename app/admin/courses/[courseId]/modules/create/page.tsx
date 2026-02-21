import { db } from "@/lib/db"
import { CreateModuleForm } from "./create-module-form"

export default async function CreateModulePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params

    let availableSessions: { id: string; title: string; startTime: Date | null; endTime: Date | null; meetingUrl: string | null }[] = []
    try {
        // Fetch available live sessions not already linked to a module
        availableSessions = await db.liveSession.findMany({
            where: {
                module: { is: null }
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

    return <CreateModuleForm courseId={courseId} availableSessions={JSON.parse(JSON.stringify(availableSessions))} />
}
