/**
 * Webhook Alert Service
 * Sends alerts via Slack and/or email when webhooks fail
 */

interface AlertPayload {
    type: 'webhook_failed' | 'webhook_retry_exhausted' | 'cron_error' | 'inactivity_detected'
    webhookId?: string
    eventType?: string
    error?: string
    retryCount?: number
    userId?: string
    details?: Record<string, unknown>
}

/**
 * Send alert to Slack webhook
 */
export async function sendSlackAlert(payload: AlertPayload): Promise<boolean> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
        console.log('[ALERT] Slack webhook URL not configured, skipping alert')
        return false
    }

    try {
        const emoji = getAlertEmoji(payload.type)
        const color = getAlertColor(payload.type)
        const title = getAlertTitle(payload.type)

        const slackPayload = {
            attachments: [
                {
                    color,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: `${emoji} ${title}`,
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*Tipo Evento:*\n${payload.eventType || 'N/A'}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Webhook ID:*\n\`${payload.webhookId || 'N/A'}\``
                                }
                            ]
                        },
                        ...(payload.error ? [{
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*Errore:*\n\`\`\`${payload.error.slice(0, 500)}\`\`\``
                            }
                        }] : []),
                        ...(payload.retryCount !== undefined ? [{
                            type: 'context',
                            elements: [
                                {
                                    type: 'mrkdwn',
                                    text: `Tentativi: ${payload.retryCount}/3`
                                }
                            ]
                        }] : []),
                        {
                            type: 'context',
                            elements: [
                                {
                                    type: 'mrkdwn',
                                    text: `LMS-INNFORM | ${new Date().toLocaleString('it-IT')}`
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload)
        })

        if (!response.ok) {
            console.error('[ALERT] Slack webhook failed:', response.status)
            return false
        }

        console.log('[ALERT] Slack alert sent successfully')
        return true
    } catch (error) {
        console.error('[ALERT] Error sending Slack alert:', error)
        return false
    }
}

/**
 * Send alert via email (using configured email service)
 */
export async function sendEmailAlert(payload: AlertPayload): Promise<boolean> {
    const alertEmail = process.env.ALERT_EMAIL_TO
    const resendApiKey = process.env.RESEND_API_KEY

    if (!alertEmail) {
        console.log('[ALERT] Alert email not configured, skipping email')
        return false
    }

    // If using Resend
    if (resendApiKey) {
        try {
            const title = getAlertTitle(payload.type)
            const htmlContent = generateEmailHtml(payload)

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'noreply@lms-innform.com',
                    to: alertEmail,
                    subject: `[LMS-INNFORM Alert] ${title}`,
                    html: htmlContent
                })
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('[ALERT] Email send failed:', error)
                return false
            }

            console.log('[ALERT] Email alert sent successfully')
            return true
        } catch (error) {
            console.error('[ALERT] Error sending email alert:', error)
            return false
        }
    }

    console.log('[ALERT] No email service configured')
    return false
}

/**
 * Send alert to all configured channels
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
    const results = await Promise.allSettled([
        sendSlackAlert(payload),
        sendEmailAlert(payload)
    ])

    const slackResult = results[0]
    const emailResult = results[1]

    console.log('[ALERT] Alert dispatch completed:', {
        slack: slackResult.status === 'fulfilled' ? slackResult.value : 'error',
        email: emailResult.status === 'fulfilled' ? emailResult.value : 'error'
    })
}

/**
 * Alert when webhook fails after all retries
 */
export async function alertWebhookFailed(
    webhookId: string,
    eventType: string,
    error: string,
    retryCount: number
): Promise<void> {
    await sendAlert({
        type: retryCount >= 3 ? 'webhook_retry_exhausted' : 'webhook_failed',
        webhookId,
        eventType,
        error,
        retryCount
    })
}

/**
 * Alert when cron job encounters an error
 */
export async function alertCronError(error: string, details?: Record<string, unknown>): Promise<void> {
    await sendAlert({
        type: 'cron_error',
        error,
        details
    })
}

/**
 * Alert when user inactivity is detected
 */
export async function alertInactivityDetected(
    userId: string,
    details: Record<string, unknown>
): Promise<void> {
    await sendAlert({
        type: 'inactivity_detected',
        userId,
        details
    })
}

// Helper functions
function getAlertEmoji(type: AlertPayload['type']): string {
    switch (type) {
        case 'webhook_failed': return '⚠️'
        case 'webhook_retry_exhausted': return '🚨'
        case 'cron_error': return '⏰'
        case 'inactivity_detected': return '💤'
        default: return '📢'
    }
}

function getAlertColor(type: AlertPayload['type']): string {
    switch (type) {
        case 'webhook_failed': return '#f59e0b' // yellow
        case 'webhook_retry_exhausted': return '#ef4444' // red
        case 'cron_error': return '#ef4444' // red
        case 'inactivity_detected': return '#6366f1' // indigo
        default: return '#3b82f6' // blue
    }
}

function getAlertTitle(type: AlertPayload['type']): string {
    switch (type) {
        case 'webhook_failed': return 'Webhook Fallito'
        case 'webhook_retry_exhausted': return 'Webhook - Tentativi Esauriti'
        case 'cron_error': return 'Errore Cron Job'
        case 'inactivity_detected': return 'Inattività Utente Rilevata'
        default: return 'Alert Sistema'
    }
}

function generateEmailHtml(payload: AlertPayload): string {
    const title = getAlertTitle(payload.type)
    const emoji = getAlertEmoji(payload.type)

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
        .value { margin-top: 5px; }
        .error { background: #fee2e2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">${emoji} ${title}</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Tipo Evento</div>
                <div class="value">${payload.eventType || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Webhook ID</div>
                <div class="value"><code>${payload.webhookId || 'N/A'}</code></div>
            </div>
            ${payload.retryCount !== undefined ? `
            <div class="field">
                <div class="label">Tentativi</div>
                <div class="value">${payload.retryCount}/3</div>
            </div>
            ` : ''}
            ${payload.error ? `
            <div class="error">
                <div class="label">Errore</div>
                <div class="value"><pre style="margin: 5px 0; white-space: pre-wrap;">${payload.error}</pre></div>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            LMS-INNFORM | ${new Date().toLocaleString('it-IT')}
        </div>
    </div>
</body>
</html>
    `
}
