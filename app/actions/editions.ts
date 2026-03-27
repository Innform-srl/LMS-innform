"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

interface CreateEditionInput {
    courseId: string
    code: string
    title: string
    description?: string
    startDate?: string
    endDate?: string
    maxParticipants?: number
    status?: string
}

export async function createEdition(input: CreateEditionInput) {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        // Verify course exists
        const course = await db.course.findUnique({
            where: { id: input.courseId },
            select: { id: true },
        })

        if (!course) {
            return { success: false, error: "Corso non trovato" }
        }

        // Check for duplicate code
        const existing = await db.edition.findUnique({
            where: {
                courseId_code: {
                    courseId: input.courseId,
                    code: input.code,
                },
            },
        })

        if (existing) {
            return { success: false, error: `Un'edizione con codice "${input.code}" esiste già per questo corso` }
        }

        const edition = await db.edition.create({
            data: {
                courseId: input.courseId,
                code: input.code,
                title: input.title,
                description: input.description || null,
                startDate: input.startDate ? new Date(input.startDate) : null,
                endDate: input.endDate ? new Date(input.endDate) : null,
                maxParticipants: input.maxParticipants ?? 30,
                status: input.status ?? "planned",
            },
            include: {
                _count: { select: { enrollments: true } },
            },
        })

        revalidatePath(`/admin/courses/${input.courseId}`)

        return {
            success: true,
            edition: {
                ...edition,
                startDate: edition.startDate?.toISOString() || null,
                endDate: edition.endDate?.toISOString() || null,
            },
        }
    } catch (error) {
        console.error("[EDITIONS] Create error:", error)
        return { success: false, error: "Errore nella creazione dell'edizione" }
    }
}

export async function updateEditionStatus(editionId: string, status: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const edition = await db.edition.update({
            where: { id: editionId },
            data: { status },
            select: { courseId: true },
        })

        revalidatePath(`/admin/courses/${edition.courseId}`)
        revalidatePath(`/admin/courses/${edition.courseId}/editions/${editionId}`)

        return { success: true }
    } catch (error) {
        console.error("[EDITIONS] Update status error:", error)
        return { success: false, error: "Errore nell'aggiornamento dello stato" }
    }
}

export async function deleteEdition(editionId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const edition = await db.edition.findUnique({
            where: { id: editionId },
            include: { _count: { select: { enrollments: true } } },
        })

        if (!edition) {
            return { success: false, error: "Edizione non trovata" }
        }

        if (edition._count.enrollments > 0) {
            return { success: false, error: `Impossibile eliminare: ci sono ${edition._count.enrollments} iscritti` }
        }

        await db.edition.delete({ where: { id: editionId } })

        revalidatePath(`/admin/courses/${edition.courseId}`)

        return { success: true, courseId: edition.courseId }
    } catch (error) {
        console.error("[EDITIONS] Delete error:", error)
        return { success: false, error: "Errore nell'eliminazione" }
    }
}
