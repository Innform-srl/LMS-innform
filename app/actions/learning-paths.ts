"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { reportError } from "@/lib/error-reporting"

const createLearningPathSchema = z.object({
    title: z.string().min(3, "Il titolo deve avere almeno 3 caratteri"),
    description: z.string().optional(),
    departmentId: z.string().optional(),
    companyId: z.string().optional(),
})

export async function createLearningPath(formData: FormData) {
    const check = await requirePermission("learning-path:manage")
    if (!check.authorized) return { success: false, error: check.error }

    const rawData = {
        title: formData.get("title"),
        description: formData.get("description"),
        departmentId: formData.get("departmentId") || undefined,
        companyId: formData.get("companyId") || undefined,
    }

    const validatedFields = createLearningPathSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.issues[0].message }
    }

    try {
        await db.learningPath.create({
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                departmentId: validatedFields.data.departmentId || null,
                companyId: validatedFields.data.companyId || null,
            }
        })

        revalidatePath("/admin/learning-paths")
        return { success: true }
    } catch (error) {
        console.error("Error creating learning path:", error)
        reportError(error, { action: "createLearningPath" })
        return { success: false, error: "Errore durante la creazione del percorso" }
    }
}

export async function deleteLearningPath(id: string) {
    const check = await requirePermission("learning-path:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.learningPath.delete({
            where: { id }
        })
        revalidatePath("/admin/learning-paths")
        revalidatePath("/learning-paths")
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'eliminazione" }
    }
}

export async function addCourseToPath(pathId: string, courseId: string) {
    const check = await requirePermission("learning-path:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        const count = await db.learningPathCourse.count({
            where: { learningPathId: pathId }
        })

        await db.learningPathCourse.create({
            data: {
                learningPathId: pathId,
                courseId: courseId,
                order: count + 1
            }
        })
        revalidatePath(`/admin/learning-paths/${pathId}`)
        return { success: true }
    } catch (_error) {
        return { success: false, message: "Errore durante l'aggiunta del corso" }
    }
}

export async function removeCourseFromPath(pathId: string, courseId: string) {
    const check = await requirePermission("learning-path:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        // Find the relation first
        const relation = await db.learningPathCourse.findFirst({
            where: { learningPathId: pathId, courseId }
        })

        if (relation) {
            await db.learningPathCourse.delete({
                where: { id: relation.id }
            })
            revalidatePath(`/admin/learning-paths/${pathId}`)
            return { success: true }
        }
        return { success: false, message: "Relazione non trovata" }
    } catch (_error) {
        return { success: false, message: "Errore durante la rimozione del corso" }
    }
}

export async function getSuggestedLearningPaths(companyId?: string, departmentId?: string) {
    const check = await requirePermission("learning-path:manage")
    if (!check.authorized) return []

    try {
        const orConditions: Array<{ companyId: string } | { departmentId: string }> = []

        if (companyId) {
            orConditions.push({ companyId })
        }

        if (departmentId) {
            orConditions.push({ departmentId })
        }

        if (orConditions.length === 0) {
            return []
        }

        const whereClause = { OR: orConditions }

        return await db.learningPath.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                description: true,
                company: { select: { name: true } },
                department: { select: { name: true } }
            }
        })
    } catch (error) {
        console.error("Error fetching suggested learning paths:", error)
        reportError(error, { action: "getSuggestedLearningPaths" })
        return []
    }
}
