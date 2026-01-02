import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })
        }

        // Validate URL
        try {
            new URL(url)
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
        }

        // Create test payload
        const payload = {
            event_type: 'test.ping',
            timestamp: new Date().toISOString(),
            data: {
                message: 'Test webhook from LMS-INNFORM',
                source: 'admin_diagnostics',
                test_id: crypto.randomUUID()
            }
        }

        const payloadString = JSON.stringify(payload)
        const secret = process.env.LMS_WEBHOOK_SECRET || 'test-secret'
        const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex')

        // Send webhook
        const startTime = Date.now()
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-LMS-Signature': signature,
                'X-LMS-Timestamp': Date.now().toString(),
                'User-Agent': 'LMS-INNFORM-Webhook/1.0'
            },
            body: payloadString
        })

        const duration = Date.now() - startTime
        let responseBody = null
        try {
            responseBody = await response.text()
        } catch {
            // Ignore parse errors
        }

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            duration,
            responseBody: responseBody?.slice(0, 500) // Limit response size
        })
    } catch (error) {
        console.error('Test webhook error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
