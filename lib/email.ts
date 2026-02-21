import { Resend } from 'resend'
// import WelcomeEmail from '@/emails/welcome'
// import CertificateEmail from '@/emails/certificate-earned'
// import CourseReminderEmail from '@/emails/course-reminder'


const resendApiKey = process.env.RESEND_API_KEY
console.log("[EMAIL] Initializing Resend with key:", resendApiKey ? "PRESENT" : "MISSING")
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

const FROM_EMAIL = 'INNFORM <noreply@innform.com>' // Sostituire con dominio verificato

export async function sendWelcomeEmail(
    toEmail: string,
    userName: string
) {
    try {
        // const emailHtml = await render(WelcomeEmail({
        //     userName,
        //     loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
        // }))
        const emailHtml = `<p>Benvenuto ${userName}!</p>`

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Benvenuto su INNFORM! 🎉',
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
    _certificateNumber: string,
    _certificateId: string,
    _verificationCode: string
) {
    try {
        const _baseUrl = process.env.NEXT_PUBLIC_APP_URL
        // const emailHtml = await render(CertificateEmail({
        //     userName,
        //     courseTitle,
        //     certificateNumber,
        //     certificateUrl: `${baseUrl}/api/certificates/${certificateId}/download`,
        //     verifyUrl: `${baseUrl}/verify-certificate?code=${verificationCode}`
        // }))
        const emailHtml = `<p>Congratulazioni ${userName}! Hai ottenuto il certificato per ${courseTitle}.</p>`

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `🎓 Certificato Ottenuto: ${courseTitle}`,
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
    _progress: number
) {
    try {
        const now = new Date()
        const diffTime = Math.abs(dueDate.getTime() - now.getTime())
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // const emailHtml = await render(CourseReminderEmail({
        //     userName,
        //     courseTitle,
        //     dueDate: dueDate.toLocaleDateString('it-IT', {
        //         day: 'numeric',
        //         month: 'long',
        //         year: 'numeric'
        //     }),
        //     daysRemaining,
        //     courseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`,
        //     progress
        // }))
        const emailHtml = `<p>Promemoria corso: ${courseTitle}. Scadenza tra ${daysRemaining} giorni.</p>`

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `⏰ Promemoria: ${courseTitle} - Scadenza tra ${daysRemaining} giorni`,
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
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Nuovo Corso Assegnato: ${courseTitle}`,
            html: `
                <h1>Nuovo Corso Assegnato</h1>
                <p>Ti è stato assegnato il corso: <strong>${courseTitle}</strong>.</p>
                <p>Inizia subito a imparare: <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Vai alla Dashboard</a></p>
            `,
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
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: `Risultato Quiz: ${quizTitle}`,
            html: `
                <h1>Risultato Quiz: ${quizTitle}</h1>
                <p>Hai ${passed ? 'superato' : 'fallito'} il quiz.</p>
                <p>Punteggio: <strong>${score}%</strong></p>
                ${passed ? '<p>Congratulazioni! Il tuo certificato è disponibile nella piattaforma.</p>' : '<p>Puoi riprovare il quiz quando vuoi.</p>'}
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Vai alla Dashboard</a></p>
            `,
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



// Test function per developemtn
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
