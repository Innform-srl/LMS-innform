"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function assignCourseToCompany(courseId: string, companyId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

    try {
        // Update course metadata
        await db.course.update({
            where: { id: courseId },
            data: { companyId }
        })

        // Bulk enroll users from company
        const users = await db.user.findMany({
            where: { companyId }
        })

        const enrollments = users.map(user => ({
            userId: user.id,
            courseId,
            progress: 0,
            completed: false
        }))

        // Use createMany with skipDuplicates to avoid errors for existing enrollments
        await db.enrollment.createMany({
            data: enrollments,
            skipDuplicates: true
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: `Corso assegnato all'azienda e ${users.length} utenti iscritti` }
    } catch (error) {
        console.error("Error assigning course to company:", error)
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function assignCourseToDepartment(courseId: string, departmentId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

    try {
        // Update course metadata
        await db.course.update({
            where: { id: courseId },
            data: { departmentId }
        })

        // Bulk enroll users from department
        const users = await db.user.findMany({
            where: { departmentId }
        })

        const enrollments = users.map(user => ({
            userId: user.id,
            courseId,
            progress: 0,
            completed: false
        }))

        await db.enrollment.createMany({
            data: enrollments,
            skipDuplicates: true
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: `Corso assegnato al dipartimento e ${users.length} utenti iscritti` }
    } catch (error) {
        console.error("Error assigning course to department:", error)
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function enrollUser(courseId: string, userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

    try {
        await db.enrollment.create({
            data: {
                courseId,
                userId,
                progress: 0,
                completed: false
            }
        })

        revalidatePath(`/admin/courses/${courseId}`)
        return { success: true, message: "Utente iscritto con successo" }
    } catch (error) {
        console.error("Error enrolling user:", error)
        return { success: false, message: "Errore durante l'iscrizione (utente forse già iscritto)" }
    }
}

export async function unenrollUser(courseId: string, userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

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
        return { success: false, message: "Errore durante la disiscrizione" }
    }
}

export async function getCourseEnrollments(courseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

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
        return []
    }
}

export async function getUnenrolledUsers(courseId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

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
        return []
    }
}

export async function updateProgress(courseId: string, progress: number) {
    const session = await auth()
    if (!session?.user?.id) return { success: false }

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
        return { success: false }
    }
}

export async function assignCourseToUser(courseId: string, userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Non autorizzato" }

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
        return { success: false, message: "Errore durante l'assegnazione" }
    }
}

export async function enrollInCourse(courseId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { success: false, message: "Sessione non valida. Effettua il login." }
    }

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
        return { success: false, message: "Errore durante l'iscrizione" }
    }
}
