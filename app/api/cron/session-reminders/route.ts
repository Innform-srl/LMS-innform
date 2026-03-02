import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resend } from "@/lib/email"
import { reportError } from "@/lib/error-reporting"
import { NotificationType } from "@prisma/client"

/**
 * Cron endpoint per reminder sessioni live e auto-mark assenti
 * Chiamare ogni ora (es. "0 * * * *")
 *
 * Setup su Vercel:
 * - Aggiungi in vercel.json:
 *   { "crons": [{ "path": "/api/cron/session-reminders", "schedule": "0 * * * *" }] }
 */
export async function GET(request: Request) {
    try {
        // Verifica authorization header (fail-closed)
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
            reminders24h: 0,
            reminders1h: 0,
            markedAbsent: 0,
            notifications: 0,
            errors: [] as string[]
        }

        // 1. Reminder 24 ore prima
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000)

        const sessions24h = await db.liveSession.findMany({
            where: {
                startTime: {
                    gte: in23Hours,
                    lte: in24Hours
                },
                reminderSent24h: false
            },
            include: {
                attendance: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                course: { select: { title: true } }
            }
        })

        for (const session of sessions24h) {
            const notificationsToCreate = []

            for (const attendance of session.attendance) {
                try {
                    await resend.emails.send({
                        from: 'INNFORM LMS <onboarding@resend.dev>',
                        to: attendance.user.email,
                        subject: `Reminder: ${session.title} - Domani`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>Promemoria Sessione</h2>
                                <p>Ciao ${attendance.user.name || attendance.user.email},</p>
                                <p>Ti ricordiamo che domani hai una sessione formativa:</p>
                                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <strong>${session.title}</strong><br/>
                                    ${session.course?.title ? `Corso: ${session.course.title}<br/>` : ''}
                                    Data: ${session.startTime!.toLocaleDateString('it-IT')}<br/>
                                    Ora: ${session.startTime!.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${session.endTime!.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <a href="${session.meetingUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Link alla Sessione
                                </a>
                            </div>
                        `
                    })

                    notificationsToCreate.push({
                        userId: attendance.user.id,
                        title: "Sessione domani",
                        message: `La sessione "${session.title}" inizia domani alle ${session.startTime!.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
                        type: NotificationType.INFO,
                        icon: "calendar",
                        link: `/live-sessions`
                    })

                    results.reminders24h++
                } catch (error: unknown) {
                    results.errors.push(`24h reminder error for ${attendance.user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
                }
            }

            // Batch: crea tutte le notifiche e segna come inviato in una transazione
            if (notificationsToCreate.length > 0) {
                await db.$transaction([
                    db.notification.createMany({ data: notificationsToCreate }),
                    db.liveSession.update({
                        where: { id: session.id },
                        data: { reminderSent24h: true }
                    })
                ])
                results.notifications += notificationsToCreate.length
            } else {
                await db.liveSession.update({
                    where: { id: session.id },
                    data: { reminderSent24h: true }
                })
            }
        }

        // 2. Reminder 1 ora prima
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000)
        const in50Minutes = new Date(now.getTime() + 50 * 60 * 1000)

        const sessions1h = await db.liveSession.findMany({
            where: {
                startTime: {
                    gte: in50Minutes,
                    lte: in1Hour
                },
                reminderSent1h: false
            },
            include: {
                attendance: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                course: { select: { title: true } }
            }
        })

        for (const session of sessions1h) {
            const notificationsToCreate = []

            for (const attendance of session.attendance) {
                try {
                    await resend.emails.send({
                        from: 'INNFORM LMS <onboarding@resend.dev>',
                        to: attendance.user.email,
                        subject: `La sessione "${session.title}" inizia tra 1 ora!`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>La sessione sta per iniziare!</h2>
                                <p>Ciao ${attendance.user.name || attendance.user.email},</p>
                                <p>La sessione <strong>${session.title}</strong> inizia tra circa 1 ora.</p>
                                <p>Assicurati di essere pronto/a!</p>
                                <a href="${session.meetingUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
                                    Unisciti ora
                                </a>
                            </div>
                        `
                    })

                    notificationsToCreate.push({
                        userId: attendance.user.id,
                        title: "Sessione tra 1 ora",
                        message: `La sessione "${session.title}" inizia tra 1 ora!`,
                        type: NotificationType.WARNING,
                        icon: "clock",
                        link: `/live-sessions`
                    })

                    results.reminders1h++
                } catch (error: unknown) {
                    results.errors.push(`1h reminder error for ${attendance.user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
                }
            }

            // Batch: crea tutte le notifiche e segna come inviato in una transazione
            if (notificationsToCreate.length > 0) {
                await db.$transaction([
                    db.notification.createMany({ data: notificationsToCreate }),
                    db.liveSession.update({
                        where: { id: session.id },
                        data: { reminderSent1h: true }
                    })
                ])
                results.notifications += notificationsToCreate.length
            } else {
                await db.liveSession.update({
                    where: { id: session.id },
                    data: { reminderSent1h: true }
                })
            }
        }

        // 3. Auto-mark assenti dopo 30 minuti dalla fine
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

        const endedSessions = await db.liveSession.findMany({
            where: {
                endTime: {
                    lt: thirtyMinutesAgo,
                    gt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // Ultimi 2 ore
                }
            },
            include: {
                attendance: {
                    where: { status: "REGISTERED" }
                }
            }
        })

        for (const session of endedSessions) {
            if (session.attendance.length > 0) {
                const result = await db.sessionAttendance.updateMany({
                    where: {
                        sessionId: session.id,
                        status: "REGISTERED"
                    },
                    data: { status: "ABSENT" }
                })
                results.markedAbsent += result.count
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            results
        })

    } catch (error: unknown) {
        console.error('Session reminders cron error:', error)
        reportError(error, { route: "cron/session-reminders" })
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
