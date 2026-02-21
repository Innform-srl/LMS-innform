"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

function extractGoogleMeetCode(url: string): string | null {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
    return match ? match[1] : null
}

const moduleSchema = z.object({
    title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
    description: z.string().optional(),
    videoUrl: z.string().url({ message: "URL video non valido" }).optional().or(z.literal("")),
    contentType: z.string().optional(),
    pdfUrl: z.string().url({ message: "URL PDF non valido" }).optional().or(z.literal("")),
    totalPages: z.coerce.number().optional(),
    minimumDuration: z.coerce.number().optional(),
    startTime: z.string().optional().or(z.literal("")).nullable(),
    endTime: z.string().optional().or(z.literal("")).nullable(),
    meetingUrl: z.string().optional().or(z.literal("")).nullable(),
})

export async function createModule(courseId: string, prevState: { message?: string } | null, formData: FormData) {
    const session = await auth()
    if (!session?.user) return { message: "Non autorizzato" }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const videoUrl = (formData.get("videoUrl") as string) || ""
    const contentType = (formData.get("contentType") as string) || "VIDEO"
    const pdfUrl = (formData.get("pdfUrl") as string) || ""
    const totalPages = formData.get("totalPages")
    const minimumDuration = formData.get("minimumDuration")

    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string
    const meetingUrl = formData.get("meetingUrl") as string
    const selectedSessionId = formData.get("selectedSessionId") as string

    const validatedFields = moduleSchema.safeParse({
        title,
        description,
        videoUrl,
        contentType,
        pdfUrl,
        totalPages,
        minimumDuration,
        startTime,
        endTime,
        meetingUrl
    })

    if (!validatedFields.success) {
        console.error("Validation errors:", JSON.stringify(validatedFields.error.issues, null, 2))
        return { message: "Campi non validi: " + validatedFields.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }
    }

    try {
        // Get the current max position
        const maxPosition = await db.module.findFirst({
            where: { courseId },
            orderBy: { position: "desc" },
            select: { position: true }
        })

        let liveSessionId = null

        if (contentType === "LIVE") {
            if (selectedSessionId) {
                // Link to an existing live session and update meetingUrl if provided
                liveSessionId = selectedSessionId
                if (meetingUrl) {
                    const googleMeetCode = extractGoogleMeetCode(meetingUrl)
                    await db.liveSession.update({
                        where: { id: selectedSessionId },
                        data: {
                            meetingUrl,
                            googleMeetCode
                        }
                    })
                }
            } else {
                if (!meetingUrl) {
                    return { message: "Per le Live Session, il link meeting è obbligatorio" }
                }
                const googleMeetCode = extractGoogleMeetCode(meetingUrl)
                const liveSession = await db.liveSession.create({
                    data: {
                        title,
                        description: description || null,
                        startTime: startTime ? new Date(startTime) : new Date(),
                        endTime: endTime ? new Date(endTime) : new Date(),
                        meetingUrl,
                        googleMeetCode,
                        courseId,
                        instructorId: session.user.id!
                    }
                })
                liveSessionId = liveSession.id
            }
        }

        await db.module.create({
            data: {
                title,
                description: description || null,
                videoUrl: videoUrl || null,
                contentType,
                pdfUrl: pdfUrl || null,
                totalPages: totalPages ? Number(totalPages) : null,
                minimumDuration: minimumDuration ? Number(minimumDuration) : 0,
                courseId,
                position: (maxPosition?.position ?? -1) + 1,
                liveSessionId
            }
        })
    } catch (error) {
        console.error(error)
        return { message: "Errore durante la creazione del modulo" }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    redirect(`/admin/courses/${courseId}`)
}

export async function deleteModule(moduleId: string, courseId: string) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Non autorizzato" }

    try {
        await db.module.delete({
            where: { id: moduleId }
        })
        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'eliminazione" }
    }
}

export async function toggleModulePublished(moduleId: string, courseId: string) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Non autorizzato" }

    try {
        const courseModule = await db.module.findUnique({ where: { id: moduleId } })
        if (!courseModule) return { success: false, message: "Modulo non trovato" }

        await db.module.update({
            where: { id: moduleId },
            data: { published: !courseModule.published }
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'aggiornamento" }
    }
}

export async function toggleCoursePublished(courseId: string) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Non autorizzato" }

    try {
        const course = await db.course.findUnique({ where: { id: courseId } })
        if (!course) return { success: false, message: "Corso non trovato" }

        await db.course.update({
            where: { id: courseId },
            data: { published: !course.published }
        })

        revalidatePath(`/admin/courses/${courseId}`)
        revalidatePath(`/admin/courses`)
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'aggiornamento" }
    }
}

export async function updateModule(
    moduleId: string,
    data: {
        title: string
        description: string | null
        videoUrl: string | null
        videoDuration: number | null
        contentType?: string | null
        pdfUrl?: string | null
        totalPages?: number | null
        minimumDuration?: number | null
        selectedSessionId?: string
        startTime?: string
        endTime?: string
        meetingUrl?: string
    }
) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Non autorizzato" }

    try {
        const courseModule = await db.module.findUnique({
            where: { id: moduleId },
            select: {
                courseId: true,
                liveSessionId: true
            }
        })

        if (!courseModule) {
            return { success: false, error: "Modulo non trovato" }
        }

        let liveSessionId = courseModule.liveSessionId

        if (data.contentType === "LIVE") {
            if (data.selectedSessionId) {
                // Link to an existing live session and update meetingUrl if provided
                liveSessionId = data.selectedSessionId
                if (data.meetingUrl) {
                    const googleMeetCode = data.meetingUrl ? extractGoogleMeetCode(data.meetingUrl) : null
                    await db.liveSession.update({
                        where: { id: data.selectedSessionId },
                        data: {
                            meetingUrl: data.meetingUrl,
                            googleMeetCode
                        }
                    })
                }
            } else {
                const googleMeetCode = data.meetingUrl ? extractGoogleMeetCode(data.meetingUrl) : null

                if (liveSessionId) {
                    // Update existing live session
                    await db.liveSession.update({
                        where: { id: liveSessionId },
                        data: {
                            title: data.title,
                            description: data.description,
                            startTime: data.startTime ? new Date(data.startTime) : undefined,
                            endTime: data.endTime ? new Date(data.endTime) : undefined,
                            meetingUrl: data.meetingUrl,
                            googleMeetCode
                        }
                    })
                } else {
                    // Create new live session
                    if (data.startTime && data.endTime && data.meetingUrl) {
                        const liveSession = await db.liveSession.create({
                            data: {
                                title: data.title,
                                description: data.description,
                                startTime: new Date(data.startTime),
                                endTime: new Date(data.endTime),
                                meetingUrl: data.meetingUrl,
                                googleMeetCode,
                                courseId: courseModule.courseId,
                                instructorId: session.user.id!
                            }
                        })
                        liveSessionId = liveSession.id
                    }
                }
            }
        }

        await db.module.update({
            where: { id: moduleId },
            data: {
                title: data.title,
                description: data.description,
                videoUrl: data.videoUrl,
                videoDuration: data.videoDuration,
                contentType: data.contentType,
                pdfUrl: data.pdfUrl,
                totalPages: data.totalPages,
                minimumDuration: data.minimumDuration || 0,
                liveSessionId
            }
        })

        revalidatePath(`/admin/courses/${courseModule.courseId}`)
        return { success: true }
    } catch (error) {
        console.error("Error updating module:", error)
        return { success: false, error: "Errore durante l'aggiornamento del modulo" }
    }
}

export async function getModulesFromOtherCourses(currentCourseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    try {
        const courses = await db.course.findMany({
            where: {
                id: { not: currentCourseId }
            },
            select: {
                id: true,
                title: true,
                modules: {
                    select: {
                        id: true,
                        title: true,
                        contentType: true
                    },
                    orderBy: { position: 'asc' }
                }
            },
            orderBy: { title: 'asc' }
        })
        return courses
    } catch (error) {
        console.error("Error fetching other courses:", error)
        return []
    }
}

export async function duplicateModule(moduleId: string, targetCourseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

    try {
        const sourceModule = await db.module.findUnique({
            where: { id: moduleId }
        })

        if (!sourceModule) return { success: false, message: "Modulo non trovato" }

        const lastModule = await db.module.findFirst({
            where: { courseId: targetCourseId },
            orderBy: { position: 'desc' }
        })

        const newPosition = (lastModule?.position || 0) + 1

        await db.module.create({
            data: {
                title: sourceModule.title + " (Copia)",
                description: sourceModule.description,
                videoUrl: sourceModule.videoUrl,
                videoDuration: sourceModule.videoDuration,
                minimumDuration: sourceModule.minimumDuration,
                contentType: sourceModule.contentType,
                pdfUrl: sourceModule.pdfUrl,
                totalPages: sourceModule.totalPages,
                position: newPosition,
                published: false,
                courseId: targetCourseId
            }
        })

        revalidatePath(`/admin/courses/${targetCourseId}`)
        return { success: true, message: "Modulo importato con successo" }
    } catch (error) {
        console.error("Error duplicating module:", error)
        return { success: false, message: "Errore durante l'importazione del modulo" }
    }
}
