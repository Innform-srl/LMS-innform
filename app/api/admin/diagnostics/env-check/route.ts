import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const REQUIRED_ENV_VARS = [
    'TMS_API_BASE_URL',
    'TMS_WEBHOOK_SECRET',
    'TMS_SUPABASE_ANON_KEY',
]

const OPTIONAL_ENV_VARS = [
    'CRON_SECRET',
    'SLACK_WEBHOOK_URL',
]

export async function GET() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const missing: string[] = []
    const configured: string[] = []

    for (const envVar of REQUIRED_ENV_VARS) {
        if (process.env[envVar]) {
            configured.push(envVar)
        } else {
            missing.push(envVar)
        }
    }

    const optional: { name: string; set: boolean }[] = OPTIONAL_ENV_VARS.map(name => ({
        name,
        set: !!process.env[name]
    }))

    return NextResponse.json({
        allSet: missing.length === 0,
        configured,
        missing,
        optional
    })
}
