import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json(
                { error: 'Verification code required' },
                { status: 400 }
            )
        }

        // Find certificate by verification code
        const certificate = await db.certificate.findUnique({
            where: { verificationCode: code },
            include: {
                enrollment: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        course: {
                            select: {
                                title: true,
                            },
                        },
                    },
                },
            },
        })

        if (!certificate) {
            return NextResponse.json(
                {
                    valid: false,
                    message: 'Certificate not found',
                },
                { status: 404 }
            )
        }

        // Return certificate details
        return NextResponse.json({
            valid: true,
            certificate: {
                number: certificate.certificateNumber,
                issuedAt: certificate.issuedAt,
                recipient: {
                    name: certificate.enrollment.user.name,
                    email: certificate.enrollment.user.email,
                },
                course: {
                    title: certificate.enrollment.course.title,
                },
                completedAt: certificate.enrollment.completedAt,
            },
        })
    } catch (error) {
        console.error('Error verifying certificate:', error)
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        )
    }
}
