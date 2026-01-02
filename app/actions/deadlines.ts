"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * Imposta un corso come obbligatorio con scadenza
 */
export async function setCourseRequired(
    courseId: string,
    isRequired: boolean,
    dueInDays: number | null
) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        // Update course
        await db.course.update({
            where: { id: courseId },
            data: {
                isRequired,
                dueInDays: isRequired ? dueInDays : null
            }
        })

        // Se il corso è obbligatorio, calcola dueDate per tutti gli enrollment esistenti
        if (isRequired && dueInDays) {
            const enrollments = await db.enrollment.findMany({
                where: { courseId, completed: false }
            })

            for (const enrollment of enrollments) {
                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + dueInDays)

                await db.enrollment.update({
                    where: { id: enrollment.id },
                    data: { dueDate }
                })
            }
        } else if (!isRequired) {
            // Se non è più obbligatorio, rimuovi le scadenze
            await db.enrollment.updateMany({
                where: { courseId },
                data: { dueDate: null }
            })
        }

        revalidatePath("/admin/courses")
        revalidatePath(`/admin/courses/${courseId}`)

        return {
            success: true,
            message: `Impostazioni scadenza aggiornate con successo`
        }
    } catch (error) {
        console.error("Error setting course required:", error)
        return {
            success: false,
            error: "Errore durante l'aggiornamento",
            message: "Errore durante l'aggiornamento delle impostazioni"
        }
    }
}

/**
 * Calcola automaticamente dueDate quando un utente viene iscritto a un corso obbligatorio
 */
export async function calculateDueDateOnEnrollment(courseId: string, enrollmentId: string) {
    try {
        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { isRequired: true, dueInDays: true }
        })

        if (course?.isRequired && course.dueInDays) {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + course.dueInDays)

            await db.enrollment.update({
                where: { id: enrollmentId },
                data: { dueDate }
            })
        }
    } catch (error) {
        console.error("Error calculating due date:", error)
    }
}

/**
 * Ottieni enrollment con scadenze imminenti per dashboard admin
 */
export async function getUpcomingDeadlines(daysAhead: number = 7) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + daysAhead)

        const enrollments = await db.enrollment.findMany({
            where: {
                completed: false,
                dueDate: {
                    lte: futureDate,
                    gte: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                dueDate: 'asc'
            }
        })

        return { success: true, enrollments }
    } catch (error) {
        console.error("Error getting upcoming deadlines:", error)
        return { success: false, error: "Errore durante il recupero delle scadenze" }
    }
}

/**
 * Ottieni enrollment scaduti
 */
export async function getOverdueEnrollments() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const enrollments = await db.enrollment.findMany({
            where: {
                completed: false,
                dueDate: {
                    lt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                dueDate: 'asc'
            }
        })

        return { success: true, enrollments }
    } catch (error) {
        console.error("Error getting overdue enrollments:", error)
        return { success: false, error: "Errore durante il recupero dei corsi scaduti" }
    }
}
