import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import PDFDocument from 'pdfkit'
import { generateQRCodeDataURL, formatDate } from '@/lib/certificate-utils'
import fs from 'fs'
import path from 'path'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ certificateId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { certificateId } = await params

        const certificate = await db.certificate.findUnique({
            where: { id: certificateId },
            include: {
                enrollment: {
                    include: {
                        user: true,
                        course: true,
                    },
                },
            },
        })

        if (!certificate) {
            return new NextResponse('Certificate not found', { status: 404 })
        }

        if (certificate.enrollment.userId !== session.user.id && session.user.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const settings = await db.certificateSettings.findFirst() || {
            companyName: "LMS Innform",
            primaryColor: "#6366f1",
            accentColor: "#8b5cf6",
            headerText: "Certificato di Completamento",
            signerName: "Il Team",
            signerTitle: "LMS Innform",
            bodyTemplate: "Si certifica che {userName} ha completato con successo il corso {courseTitle} in data {completionDate}"
        }

        let regularFont: Buffer | undefined
        let boldFont: Buffer | undefined
        const debugInfo: string[] = []

        try {
            const cwd = process.cwd()
            debugInfo.push(`CWD: ${cwd}`)

            const fontDir = path.join(cwd, 'assets', 'fonts')
            const regPath = path.join(fontDir, 'Roboto-Regular.ttf')
            const boldPath = path.join(fontDir, 'Roboto-Bold.ttf')

            debugInfo.push(`Trying path: ${regPath}`)

            if (fs.existsSync(regPath)) {
                regularFont = fs.readFileSync(regPath)
                boldFont = fs.readFileSync(boldPath)
                debugInfo.push('Loaded from CWD')
            } else {
                const absDir = 'C:\\Users\\frali\\LMS-INNFORM\\assets\\fonts'
                const absReg = path.join(absDir, 'Roboto-Regular.ttf')
                const absBold = path.join(absDir, 'Roboto-Bold.ttf')

                debugInfo.push(`Trying absolute path: ${absReg}`)

                if (fs.existsSync(absReg)) {
                    regularFont = fs.readFileSync(absReg)
                    boldFont = fs.readFileSync(absBold)
                    debugInfo.push('Loaded from Absolute')
                } else {
                    throw new Error(`Fonts not found. Tried: ${regPath} AND ${absReg}`)
                }
            }
        } catch (e: any) {
            console.error("Failed to load local fonts", e)
            return new NextResponse(`Font Load Error: ${e.message} | Debug: ${debugInfo.join('; ')}`, { status: 500 })
        }

        // CRITICAL FIX: Pass the font buffer directly to the constructor
        // This prevents pdfkit from trying to load the default 'Helvetica' font
        const doc = new PDFDocument({
            autoFirstPage: false,
            bufferPages: true
        })

        if (regularFont && boldFont) {
            doc.registerFont('Roboto', regularFont)
            doc.registerFont('Roboto-Bold', boldFont)

            // Safety net: Map Helvetica to our font too
            doc.registerFont('Helvetica', regularFont)
            doc.registerFont('Helvetica-Bold', boldFont)
        } else {
            return new NextResponse(`Fonts failed to load but no error thrown? Debug: ${debugInfo.join('; ')}`, { status: 500 })
        }

        doc.addPage({
            layout: 'landscape',
            size: 'A4',
            margin: 0
        })

        // Ensure we are using the named font for subsequent text
        doc.font('Roboto')

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))

        return new Promise<NextResponse>((resolve, reject) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks)
                resolve(
                    new NextResponse(pdfBuffer, {
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': `attachment; filename="Certificate-${certificate.certificateNumber}.pdf"`,
                        },
                    })
                )
            })

            doc.on('error', (err) => {
                reject(err)
            })

            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff')

            doc.lineWidth(20)
                .strokeColor(settings.primaryColor)
                .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
                .stroke()

            doc.moveDown(2)
            doc.font('Roboto-Bold')
                .fontSize(40)
                .fillColor(settings.primaryColor)
                .text(settings.headerText, 0, 100, { align: 'center' })

            doc.moveDown(0.5)
            doc.font('Roboto')
                .fontSize(16)
                .fillColor('#666666')
                .text('Questo documento certifica che', { align: 'center' })

            doc.moveDown(1)
            doc.font('Roboto-Bold')
                .fontSize(32)
                .fillColor('#000000')
                .text(certificate.enrollment.user.name || certificate.enrollment.user.email, { align: 'center' })

            doc.moveDown(0.5)
            doc.font('Roboto')
                .fontSize(16)
                .fillColor('#666666')
                .text('ha completato con successo il corso', { align: 'center' })

            doc.moveDown(0.5)
            doc.font('Roboto-Bold')
                .fontSize(24)
                .fillColor(settings.accentColor)
                .text(certificate.enrollment.course.title, { align: 'center' })

            doc.moveDown(1)
            doc.font('Roboto')
                .fontSize(14)
                .fillColor('#666666')
                .text(`in data ${formatDate(certificate.issuedAt)}`, { align: 'center' })

            const bottomY = doc.page.height - 150

            doc.fontSize(10)
                .fillColor('#999999')
                .text(`Certificato N: ${certificate.certificateNumber}`, 60, bottomY)

            doc.text(`Codice Verifica: ${certificate.verificationCode}`, 60, bottomY + 15)
            doc.text(`Rilasciato da: ${settings.companyName}`, 60, bottomY + 30)

            generateQRCodeDataURL(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-certificate?code=${certificate.verificationCode}`)
                .then(qrDataUrl => {
                    doc.image(qrDataUrl, 60, bottomY + 50, { width: 80 })
                    doc.end()
                })
                .catch(err => {
                    console.error("QR Gen Error", err)
                    doc.end()
                })
        })

    } catch (error: any) {
        console.error('Error generating certificate:', error)
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 })
    }
}
