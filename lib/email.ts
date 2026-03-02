import { Resend } from 'resend'
import { render } from '@react-email/components'
import WelcomeEmail from '@/emails/welcome'
import CertificateEmail from '@/emails/certificate-earned'
import CourseReminderEmail from '@/emails/course-reminder'
import CourseAssignedEmail from '@/emails/course-assigned'
import QuizResultEmail from '@/emails/quiz-result'

const resendApiKey = process.env.RESEND_API_KEY
export const resend = resendApiKey
    ? new Resend(resendApiKey)
    : {
        emails: {
            send: async () => {
                console.log("[MOCK EMAIL] Resend API Key missing. Email simulated.")
                return { data: { id: 'mock-id' }, error: null }
            }
        }
    } as unknown as Resend

const FROM_EMAIL = 'INNFORM <noreply@innform.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://innform.com/lms'

export async function sendWelcomeEmail(
    toEmail: string,
    userName: string
) {
    try {
        const emailHtml = await render(WelcomeEmail({
            userName,
            loginUrl: `${BASE_URL}/login`
        }))

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Benvenuto su INNFORM!',
            html: emailHtml,
        })

        if (error) {
            console.error('[EMAIL] Welcome email error:', error)
            return { success: false, error }
        }

        console.log('[EMAIL] Welcome email sent:', data?.id)
        return { success: true, data }
    } catch (error) {
        console.error('[EMAIL] Welcome email failed:', error)
        return { success: false, error }
    }
}

export async function sendCertificateEmail(
    toEmail: string,
    userName: string,
    courseTitle: string,
    certificateNumber: string,
    certificateId: string,
    verificationCode: string
) {
    try {
        const emailHtml = await render(CertificateEmail({
            userName,
            courseTitle,
            certificateNumber,
            certificateUrl: `${BASE_URL}/api/certificates/${certificateId}/download`,
            verifyUrl: `${BASE_URL}/verify-certificate?code=${verificationCode}`
        }))

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Certificato Ottenuto: ${courseTitle}`,
            html: emailHtml,
        })

        if (error) {
            console.error('[EMAIL] Certificate email error:', error)
            return { success: false, error }
        }

        console.log('[EMAIL] Certificate email sent:', data?.id)
        return { success: true, data }
    } catch (error) {
        console.error('[EMAIL] Certificate email failed:', error)
        return { success: false, error }
    }
}

export async function sendCourseReminderEmail(
    toEmail: string,
    userName: string,
    courseTitle: string,
    courseId: string,
    dueDate: Date,
    progress: number
) {
    try {
        const now = new Date()
        const diffTime = Math.abs(dueDate.getTime() - now.getTime())
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const emailHtml = await render(CourseReminderEmail({
            userName,
            courseTitle,
            dueDate: dueDate.toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            daysRemaining,
            courseUrl: `${BASE_URL}/courses/${courseId}`,
            progress
        }))

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Promemoria: ${courseTitle} - Scadenza tra ${daysRemaining} giorni`,
            html: emailHtml,
        })

        if (error) {
            console.error('[EMAIL] Reminder email error:', error)
            return { success: false, error }
        }

        console.log('[EMAIL] Reminder email sent:', data?.id)
        return { success: true, data }
    } catch (error) {
        console.error('[EMAIL] Reminder email failed:', error)
        return { success: false, error }
    }
}

export async function sendCourseAssignedEmail(
    toEmail: string,
    courseTitle: string
) {
    try {
        const emailHtml = await render(CourseAssignedEmail({
            courseTitle,
            dashboardUrl: `${BASE_URL}/dashboard`
        }))

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Nuovo Corso Assegnato: ${courseTitle}`,
            html: emailHtml,
        })

        if (error) {
            console.error('[EMAIL] Course assigned email error:', error)
            return { success: false, error }
        }

        return { success: true, data }
    } catch (error) {
        console.error('[EMAIL] Course assigned email failed:', error)
        return { success: false, error }
    }
}

export async function sendQuizResultEmail(
    toEmail: string,
    quizTitle: string,
    passed: boolean,
    score: number
) {
    try {
        const emailHtml = await render(QuizResultEmail({
            quizTitle,
            passed,
            score,
            dashboardUrl: `${BASE_URL}/dashboard`
        }))

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Risultato Quiz: ${quizTitle}`,
            html: emailHtml,
        })

        if (error) {
            console.error('[EMAIL] Quiz result email error:', error)
            return { success: false, error }
        }

        return { success: true, data }
    } catch (error) {
        console.error('[EMAIL] Quiz result email failed:', error)
        return { success: false, error }
    }
}

export async function sendTestEmail(to: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Test Email da INNFORM',
            html: '<p>Questa è una email di test. Se la ricevi, Resend funziona correttamente!</p>',
        })

        if (error) {
            return { success: false, error }
        }

        return { success: true, data }
    } catch (error) {
        return { success: false, error }
    }
}
