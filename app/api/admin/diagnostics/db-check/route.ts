import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Simple query to test connection
        await db.$queryRaw`SELECT 1`

        return NextResponse.json({
            connected: true,
            message: 'Database connection successful'
        })
    } catch (error) {
        console.error('Database connection error:', error)
        return NextResponse.json({
            connected: false,
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
