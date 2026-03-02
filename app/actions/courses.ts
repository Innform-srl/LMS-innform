"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { bulkEnrollUsers } from "@/lib/enrollment-utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { reportError } from "@/lib/error-reporting"

const courseSchema = z.object({
    title: z.string().min(1, { message: "Il titolo è obbligatorio" }),
    description: z.string().optional(),
})

export async function createCourse(prevState: { success?: boolean; message?: string } | null, formData: FormData) {
    const check = await requirePermission("course:create")
    if (!check.authorized) return { success: false, message: check.error }

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
            const users = await db.user.findMany({ where: { companyId }, select: { id: true } })
            await bulkEnrollUsers(users.map(u => u.id), course.id)
        } else if (departmentId) {
            const users = await db.user.findMany({ where: { departmentId }, select: { id: true } })
            await bulkEnrollUsers(users.map(u => u.id), course.id)
        }

        revalidatePath("/admin/courses")
        revalidateTag("admin-overview")
        return { success: true, message: "Corso creato con successo!", courseId: course.id }

    } catch (error) {
        console.error("Error creating course:", error)
        reportError(error, { action: "createCourse" })
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
    const check = await requirePermission("course:edit")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.course.update({
            where: { id: courseId },
            data: {
                isRequired: settings.isRequired,
                dueInDays: settings.isRequired ? settings.dueInDays : null,
                minimumDuration: settings.minimumDuration
            }
        })

        // Handle deadline logic - batch update instead of loop
        if (settings.isRequired && settings.dueInDays) {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + settings.dueInDays)
            await db.enrollment.updateMany({
                where: { courseId, completed: false },
                data: { dueDate }
            })
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
        reportError(error, { action: "updateCourseSettings" })
        return { success: false, message: "Errore durante l'aggiornamento" }
    }
}

export async function renameCourse(courseId: string, newTitle: string) {
    const check = await requirePermission("course:edit")
    if (!check.authorized) return { success: false, message: check.error }

    if (!newTitle || newTitle.trim().length === 0) {
        return { success: false, message: "Il titolo non può essere vuoto" }
    }

    try {
        await db.course.update({
            where: { id: courseId },
            data: { title: newTitle.trim() }
        })

        revalidatePath("/admin/courses")
        revalidateTag("admin-overview")
        return { success: true, message: "Corso rinominato con successo" }
    } catch (error) {
        console.error("Error renaming course:", error)
        reportError(error, { action: "renameCourse" })
        return { success: false, message: "Errore durante la rinomina" }
    }
}

export async function archiveCourse(courseId: string) {
    const check = await requirePermission("course:archive")
    if (!check.authorized) return { success: false, message: check.error }

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
        revalidateTag("admin-overview")
        return { success: true, message: "Corso archiviato con successo" }
    } catch (error) {
        console.error("Error archiving course:", error)
        reportError(error, { action: "archiveCourse" })
        return { success: false, message: "Errore durante l'archiviazione" }
    }
}

export async function restoreCourse(courseId: string) {
    const check = await requirePermission("course:archive")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.course.update({
            where: { id: courseId },
            data: {
                archived: false,
                archivedAt: null
            }
        })

        revalidatePath("/admin/courses")
        revalidateTag("admin-overview")
        return { success: true, message: "Corso ripristinato con successo" }
    } catch (error) {
        console.error("Error restoring course:", error)
        reportError(error, { action: "restoreCourse" })
        return { success: false, message: "Errore durante il ripristino" }
    }
}

export async function deleteCourse(courseId: string) {
    const check = await requirePermission("course:delete")
    if (!check.authorized) return { success: false, message: check.error }

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

        // Delete related data first - batch operations instead of loops
        await db.comment.deleteMany({ where: { courseId } })
        await db.courseRating.deleteMany({ where: { courseId } })
        await db.learningPathCourse.deleteMany({ where: { courseId } })

        // Get all module IDs for this course
        const moduleIds = (await db.module.findMany({
            where: { courseId },
            select: { id: true }
        })).map(m => m.id)

        if (moduleIds.length > 0) {
            // Delete module progress in batch
            await db.moduleProgress.deleteMany({
                where: { moduleId: { in: moduleIds } }
            })

            // Get all quiz IDs for these modules
            const quizIds = (await db.quiz.findMany({
                where: { moduleId: { in: moduleIds } },
                select: { id: true }
            })).map(q => q.id)

            if (quizIds.length > 0) {
                // Delete quiz attempts and questions in batch
                await db.quizAttempt.deleteMany({
                    where: { quizId: { in: quizIds } }
                })
                await db.question.deleteMany({
                    where: { quizId: { in: quizIds } }
                })
            }

            // Delete quizzes in batch
            await db.quiz.deleteMany({
                where: { moduleId: { in: moduleIds } }
            })
        }

        // Delete all modules
        await db.module.deleteMany({ where: { courseId } })

        // Delete TMS mappings if they exist
        await db.courseTMSMapping.deleteMany({ where: { courseId } })

        // Finally delete the course
        await db.course.delete({ where: { id: courseId } })

        revalidatePath("/admin/courses")
        revalidateTag("admin-overview")
        return { success: true, message: "Corso eliminato definitivamente" }
    } catch (error) {
        console.error("Error deleting course:", error)
        reportError(error, { action: "deleteCourse" })
        return { success: false, message: "Errore durante l'eliminazione: " + (error as Error).message }
    }
}
