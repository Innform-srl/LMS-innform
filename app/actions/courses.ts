"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const courseSchema = z.object({
    title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
    description: z.string().optional(),
})

export async function createCourse(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Non autorizzato" }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const companyId = formData.get("companyId") as string || undefined
    const departmentId = formData.get("departmentId") as string || undefined

    const validatedFields = courseSchema.safeParse({ title, description })

    if (!validatedFields.success) {
        return { success: false, message: "Campi non validi" }
    }

    try {
        const course = await db.course.create({
            data: {
                title,
                description,
                companyId,
                departmentId
            }
        })

        // Trigger bulk enrollment if assigned to group
        if (companyId) {
            const users = await db.user.findMany({ where: { companyId } })
            if (users.length > 0) {
                await db.enrollment.createMany({
                    data: users.map(user => ({
                        userId: user.id,
                        courseId: course.id,
                        progress: 0,
                        completed: false
                    })),
                    skipDuplicates: true
                })
            }
        } else if (departmentId) {
            const users = await db.user.findMany({ where: { departmentId } })
            if (users.length > 0) {
                await db.enrollment.createMany({
                    data: users.map(user => ({
                        userId: user.id,
                        courseId: course.id,
                        progress: 0,
                        completed: false
                    })),
                    skipDuplicates: true
                })
            }
        }

        revalidatePath("/admin/courses")
        return { success: true, message: "Corso creato con successo!", courseId: course.id }

    } catch (error) {
        console.error("Error creating course:", error)
        return { success: false, message: "Errore durante la creazione del corso: " + (error as Error).message }
    }
}

export async function updateCourseSettings(
    courseId: string,
    settings: {
        isRequired: boolean
        dueInDays: number | null
        minimumDuration: number
    }
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "Non autorizzato" }
    }

    try {
        await db.course.update({
            where: { id: courseId },
            data: {
                isRequired: settings.isRequired,
                dueInDays: settings.isRequired ? settings.dueInDays : null,
                minimumDuration: settings.minimumDuration
            }
        })

        // Handle deadline logic (copied from deadlines.ts)
        if (settings.isRequired && settings.dueInDays) {
            const enrollments = await db.enrollment.findMany({
                where: { courseId, completed: false }
            })

            for (const enrollment of enrollments) {
                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + settings.dueInDays)
                await db.enrollment.update({
                    where: { id: enrollment.id },
                    data: { dueDate }
                })
            }
        } else if (!settings.isRequired) {
            await db.enrollment.updateMany({
                where: { courseId },
                data: { dueDate: null }
            })
        }

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: "Impostazioni aggiornate con successo" }
    } catch (error) {
        console.error("Error updating course settings:", error)
        return { success: false, message: "Errore durante l'aggiornamento" }
    }
}

export async function renameCourse(courseId: string, newTitle: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "Non autorizzato" }
    }

    if (!newTitle || newTitle.trim().length === 0) {
        return { success: false, message: "Il titolo non può essere vuoto" }
    }

    try {
        await db.course.update({
            where: { id: courseId },
            data: { title: newTitle.trim() }
        })

        revalidatePath("/admin/courses")
        return { success: true, message: "Corso rinominato con successo" }
    } catch (error) {
        console.error("Error renaming course:", error)
        return { success: false, message: "Errore durante la rinomina" }
    }
}

export async function archiveCourse(courseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "Non autorizzato" }
    }

    try {
        await db.course.update({
            where: { id: courseId },
            data: {
                archived: true,
                archivedAt: new Date(),
                published: false // Unpublish when archiving
            }
        })

        revalidatePath("/admin/courses")
        return { success: true, message: "Corso archiviato con successo" }
    } catch (error) {
        console.error("Error archiving course:", error)
        return { success: false, message: "Errore durante l'archiviazione" }
    }
}

export async function restoreCourse(courseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "Non autorizzato" }
    }

    try {
        await db.course.update({
            where: { id: courseId },
            data: {
                archived: false,
                archivedAt: null
            }
        })

        revalidatePath("/admin/courses")
        return { success: true, message: "Corso ripristinato con successo" }
    } catch (error) {
        console.error("Error restoring course:", error)
        return { success: false, message: "Errore durante il ripristino" }
    }
}

export async function deleteCourse(courseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, message: "Non autorizzato" }
    }

    try {
        // Check if course has enrollments
        const enrollmentCount = await db.enrollment.count({
            where: { courseId }
        })

        if (enrollmentCount > 0) {
            return {
                success: false,
                message: `Impossibile eliminare: il corso ha ${enrollmentCount} iscrizioni. Archivialo invece.`
            }
        }

        // Delete related data first
        await db.comment.deleteMany({ where: { courseId } })
        await db.courseRating.deleteMany({ where: { courseId } })
        await db.learningPathCourse.deleteMany({ where: { courseId } })

        // Delete modules and their related data
        const modules = await db.module.findMany({ where: { courseId } })
        for (const mod of modules) {
            await db.moduleProgress.deleteMany({ where: { moduleId: mod.id } })
            // Delete quiz attempts and questions
            const quizzes = await db.quiz.findMany({ where: { moduleId: mod.id } })
            for (const quiz of quizzes) {
                await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } })
                await db.question.deleteMany({ where: { quizId: quiz.id } })
            }
            await db.quiz.deleteMany({ where: { moduleId: mod.id } })
        }
        await db.module.deleteMany({ where: { courseId } })

        // Delete TMS mappings if they exist
        await db.courseTMSMapping.deleteMany({ where: { courseId } })

        // Finally delete the course
        await db.course.delete({ where: { id: courseId } })

        revalidatePath("/admin/courses")
        return { success: true, message: "Corso eliminato definitivamente" }
    } catch (error) {
        console.error("Error deleting course:", error)
        return { success: false, message: "Errore durante l'eliminazione: " + (error as Error).message }
    }
}
