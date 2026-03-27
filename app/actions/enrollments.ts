"use server"

import { db } from "@/lib/db"
import { requirePermission, requireAuth } from "@/lib/permissions"
import { bulkEnrollUsers } from "@/lib/enrollment-utils"
import { revalidatePath } from "next/cache"
import { reportError } from "@/lib/error-reporting"

export async function assignCourseToCompany(courseId: string, companyId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        // Update course metadata
        await db.course.update({
            where: { id: courseId },
            data: { companyId }
        })

        // Bulk enroll users from company
        const users = await db.user.findMany({
            where: { companyId },
            select: { id: true }
        })

        await bulkEnrollUsers(users.map(u => u.id), courseId)

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: `Corso assegnato all'azienda e ${users.length} utenti iscritti` }
    } catch (error) {
        console.error("Error assigning course to company:", error)
        reportError(error, { action: "assignCourseToCompany" })
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function assignCourseToDepartment(courseId: string, departmentId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        // Update course metadata
        await db.course.update({
            where: { id: courseId },
            data: { departmentId }
        })

        // Bulk enroll users from department
        const users = await db.user.findMany({
            where: { departmentId },
            select: { id: true }
        })

        await bulkEnrollUsers(users.map(u => u.id), courseId)

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: `Corso assegnato al dipartimento e ${users.length} utenti iscritti` }
    } catch (error) {
        console.error("Error assigning course to department:", error)
        reportError(error, { action: "assignCourseToDepartment" })
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function enrollUser(courseId: string, userId: string, editionId?: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.enrollment.create({
            data: {
                courseId,
                userId,
                editionId: editionId || null,
                progress: 0,
                completed: false
            }
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: "Utente iscritto con successo" }
    } catch (error) {
        console.error("Error enrolling user:", error)
        reportError(error, { action: "enrollUser" })
        return { success: false, message: "Errore durante l'iscrizione (utente forse già iscritto)" }
    }
}

export async function unenrollUser(courseId: string, userId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        await db.enrollment.deleteMany({
            where: {
                courseId,
                userId
            }
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: "Utente disiscritto con successo" }
    } catch (error) {
        console.error("Error unenrolling user:", error)
        reportError(error, { action: "unenrollUser" })
        return { success: false, message: "Errore durante la disiscrizione" }
    }
}

/**
 * Restore a soft-deleted enrollment.
 */
export async function restoreEnrollment(enrollmentId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        const enrollment = await db.enrollment.update({
            where: { id: enrollmentId, deletedAt: { not: null } },
            data: { deletedAt: null },
        })

        revalidatePath(`/admin/courses/${enrollment.courseId}`)
        return { success: true, message: "Iscrizione ripristinata" }
    } catch (error) {
        console.error("Error restoring enrollment:", error)
        reportError(error, { action: "restoreEnrollment" })
        return { success: false, message: "Errore durante il ripristino" }
    }
}

export async function getCourseEnrollments(courseId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return []

    try {
        const enrollments = await db.enrollment.findMany({
            where: { courseId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: { select: { name: true } },
                        company: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return enrollments
    } catch (error) {
        console.error("Error fetching enrollments:", error)
        reportError(error, { action: "getCourseEnrollments" })
        return []
    }
}

export async function getUnenrolledUsers(courseId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return []

    try {
        const users = await db.user.findMany({
            where: {
                role: "EMPLOYEE",
                enrollments: {
                    none: {
                        courseId
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                department: { select: { name: true } },
                company: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        })
        return users
    } catch (error) {
        console.error("Error fetching unenrolled users:", error)
        reportError(error, { action: "getUnenrolledUsers" })
        return []
    }
}

export async function updateProgress(courseId: string, progress: number) {
    const check = await requireAuth()
    if (!check.authorized) return { success: false }
    const session = check.session

    try {
        await db.enrollment.updateMany({
            where: {
                courseId,
                userId: session.user.id
            },
            data: {
                progress,
                completed: progress >= 100
            }
        })

        revalidatePath(`/courses/${courseId}`)
        return { success: true }
    } catch (error) {
        console.error("Error updating progress:", error)
        reportError(error, { action: "updateProgress" })
        return { success: false }
    }
}

export async function assignCourseToUser(courseId: string, userId: string) {
    const check = await requirePermission("enrollment:manage")
    if (!check.authorized) return { success: false, message: check.error }

    try {
        // Create enrollment
        await db.enrollment.create({
            data: {
                userId,
                courseId,
                progress: 0,
                completed: false,
                timeSpent: 0
            }
        })

        revalidatePath(`/admin/users/${userId}`)
        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: "Corso assegnato con successo" }
    } catch (error) {
        console.error("Error assigning course to user:", error)
        reportError(error, { action: "assignCourseToUser" })
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function enrollInCourse(courseId: string) {
    const check = await requireAuth()
    if (!check.authorized) {
        return { success: false, message: check.error }
    }
    const session = check.session

    try {
        // Check if already enrolled
        const existingEnrollment = await db.enrollment.findFirst({
            where: {
                courseId,
                userId: session.user.id
            }
        })

        if (existingEnrollment) {
            return { success: false, message: "Sei già iscritto a questo corso" }
        }

        // Check if course exists and is published
        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { id: true, published: true }
        })

        if (!course) {
            return { success: false, message: "Corso non trovato" }
        }

        if (!course.published) {
            return { success: false, message: "Questo corso non è disponibile per l'iscrizione" }
        }

        // Create enrollment
        await db.enrollment.create({
            data: {
                userId: session.user.id,
                courseId,
                progress: 0,
                completed: false,
                timeSpent: 0
            }
        })

        revalidatePath(`/courses/${courseId}`)
        revalidatePath('/courses')
        return { success: true, message: "Iscrizione completata con successo" }
    } catch (error) {
        console.error("Error enrolling in course:", error)
        reportError(error, { action: "enrollInCourse" })
        return { success: false, message: "Errore durante l'iscrizione" }
    }
}
