import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resend } from "@/lib/email"
import { deadlineReminder3Days, deadlineReminder1Day, deadlineOverdue } from "@/lib/email-templates-deadlines"

/**
 * Cron endpoint per controllare scadenze e inviare reminder
 * Deve essere chiamato giornalmente (es. alle 9:00)
 * 
 * Setup su Vercel:
 * - Aggiungi in vercel.json: 
 *   { "crons": [{ "path": "/api/cron/check-deadlines", "schedule": "0 9 * * *" }] }
 * 
 * Setup manuale:
 * - Usa un servizio come cron-job.org o EasyCron
 * - URL: https://tuodominio.com/api/cron/check-deadlines
 * - Aggiungi header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
    try {
        // Verifica authorization header per sicurezza (fail-closed)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Non autorizzato' },
                { status: 401 }
            )
        }

        const now = new Date()
        const results = {
            reminders3Days: 0,
            reminders1Day: 0,
            overdueNotifications: 0,
            errors: [] as string[]
        }

        // 1. Reminder 3 giorni prima
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
        threeDaysFromNow.setHours(0, 0, 0, 0)

        const threeDaysEnd = new Date(threeDaysFromNow)
        threeDaysEnd.setHours(23, 59, 59, 999)

        const enrollments3Days = await db.enrollment.findMany({
            where: {
                completed: false,
                dueDate: {
                    gte: threeDaysFromNow,
                    lte: threeDaysEnd
                },
                // Non ha già ricevuto questo reminder
                reminders: {
                    none: {
                        type: '3_DAYS'
                    }
                }
            },
            include: {
                user: { select: { name: true, email: true } },
                course: { select: { title: true, id: true } }
            }
        })

        for (const enrollment of enrollments3Days) {
            try {
                const emailData = {
                    userName: enrollment.user.name || enrollment.user.email,
                    courseTitle: enrollment.course.title,
                    dueDate: enrollment.dueDate!,
                    courseId: enrollment.course.id
                }

                const template = deadlineReminder3Days(emailData)

                await resend.emails.send({
                    from: 'INNFORM LMS <onboarding@resend.dev>',
                    to: enrollment.user.email,
                    subject: template.subject,
                    html: template.html
                })

                // Log reminder inviato
                await db.reminder.create({
                    data: {
                        enrollmentId: enrollment.id,
                        type: '3_DAYS'
                    }
                })

                results.reminders3Days++
            } catch (error: unknown) {
                results.errors.push(`3 days reminder error for ${enrollment.user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
        }

        // 2. Reminder 1 giorno prima
        const oneDayFromNow = new Date()
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)
        oneDayFromNow.setHours(0, 0, 0, 0)

        const oneDayEnd = new Date(oneDayFromNow)
        oneDayEnd.setHours(23, 59, 59, 999)

        const enrollments1Day = await db.enrollment.findMany({
            where: {
                completed: false,
                dueDate: {
                    gte: oneDayFromNow,
                    lte: oneDayEnd
                },
                reminders: {
                    none: {
                        type: '1_DAY'
                    }
                }
            },
            include: {
                user: { select: { name: true, email: true } },
                course: { select: { title: true, id: true } }
            }
        })

        for (const enrollment of enrollments1Day) {
            try {
                const emailData = {
                    userName: enrollment.user.name || enrollment.user.email,
                    courseTitle: enrollment.course.title,
                    dueDate: enrollment.dueDate!,
                    courseId: enrollment.course.id
                }

                const template = deadlineReminder1Day(emailData)

                await resend.emails.send({
                    from: 'INNFORM LMS <onboarding@resend.dev>',
                    to: enrollment.user.email,
                    subject: template.subject,
                    html: template.html
                })

                await db.reminder.create({
                    data: {
                        enrollmentId: enrollment.id,
                        type: '1_DAY'
                    }
                })

                results.reminders1Day++
            } catch (error: unknown) {
                results.errors.push(`1 day reminder error for ${enrollment.user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
        }

        // 3. Notifiche per corsi scaduti
        const overdueEnrollments = await db.enrollment.findMany({
            where: {
                completed: false,
                dueDate: {
                    lt: now
                },
                reminders: {
                    none: {
                        type: 'OVERDUE'
                    }
                }
            },
            include: {
                user: { select: { name: true, email: true } },
                course: { select: { title: true, id: true } }
            }
        })

        for (const enrollment of overdueEnrollments) {
            try {
                const emailData = {
                    userName: enrollment.user.name || enrollment.user.email,
                    courseTitle: enrollment.course.title,
                    dueDate: enrollment.dueDate!,
                    courseId: enrollment.course.id
                }

                const template = deadlineOverdue(emailData)

                await resend.emails.send({
                    from: 'INNFORM LMS <onboarding@resend.dev>',
                    to: enrollment.user.email,
                    subject: template.subject,
                    html: template.html
                })

                await db.reminder.create({
                    data: {
                        enrollmentId: enrollment.id,
                        type: 'OVERDUE'
                    }
                })

                results.overdueNotifications++
            } catch (error: unknown) {
                results.errors.push(`Overdue notification error for ${enrollment.user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            results
        })

    } catch (error: unknown) {
        console.error('Cron job error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
