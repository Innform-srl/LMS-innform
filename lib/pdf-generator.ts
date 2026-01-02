import PDFDocument from 'pdfkit'
import { formatDate, generateQRCodeDataURL, minutesToHours } from './certificate-utils'

interface CertificateData {
    certificateNumber: string
    userName: string
    courseTitle: string
    completionDate: Date
    timeSpent: number // in minutes
    verificationCode: string
}

interface CertificateSettings {
    companyName: string
    logoUrl?: string | null
    signerName: string
    signerTitle: string
    signatureUrl?: string | null
    primaryColor: string
    accentColor: string
    headerText: string
    bodyTemplate: string
}

/**
 * Generate a PDF certificate
 * Returns a Buffer that can be sent as HTTP response
 */
export async function generateCertificatePDF(
    data: CertificateData,
    settings: CertificateSettings
): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
            })

            const buffers: Buffer[] = []
            doc.on('data', buffers.push.bind(buffers))
            doc.on('end', () => resolve(Buffer.concat(buffers)))
            doc.on('error', reject)

            // Page dimensions
            const pageWidth = doc.page.width
            const pageHeight = doc.page.height

            // Draw decorative border
            doc
                .rect(40, 40, pageWidth - 80, pageHeight - 80)
                .lineWidth(3)
                .stroke(settings.primaryColor)

            doc
                .rect(50, 50, pageWidth - 100, pageHeight - 100)
                .lineWidth(1)
                .stroke(settings.accentColor)

            // Header - Company Logo (if available)
            let yPosition = 80

            if (settings.logoUrl) {
                // Note: In production, you'd fetch and embed the actual logo
                // For now, just leave space
                yPosition += 60
            }

            // Header Text
            doc
                .fontSize(32)
                .font('Helvetica-Bold')
                .fillColor(settings.primaryColor)
                .text(settings.headerText, 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 60

            // Decorative line
            const lineY = yPosition
            doc
                .moveTo(pageWidth / 2 - 100, lineY)
                .lineTo(pageWidth / 2 + 100, lineY)
                .lineWidth(2)
                .stroke(settings.accentColor)

            yPosition += 40

            // Body - "This certifies that"
            doc
                .fontSize(14)
                .font('Helvetica')
                .fillColor('#000000')
                .text('Questo certifica che', 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 40

            // User Name (large and prominent)
            doc
                .fontSize(28)
                .font('Helvetica-Bold')
                .fillColor(settings.primaryColor)
                .text(data.userName, 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 50

            // "has successfully completed"
            doc
                .fontSize(14)
                .font('Helvetica')
                .fillColor('#000000')
                .text('ha completato con successo il corso', 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 35

            // Course Title
            doc
                .fontSize(20)
                .font('Helvetica-Bold')
                .fillColor('#000000')
                .text(data.courseTitle, 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 45

            // Completion Date
            doc
                .fontSize(12)
                .font('Helvetica')
                .text(`il ${formatDate(data.completionDate)}`, 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            yPosition += 30

            // Time spent
            doc
                .fontSize(11)
                .fillColor('#666666')
                .text(`Tempo di studio: ${minutesToHours(data.timeSpent)}`, 0, yPosition, {
                    align: 'center',
                    width: pageWidth,
                })

            // Footer area
            const footerY = pageHeight - 140

            // Left side: Certificate Number
            doc
                .fontSize(10)
                .fillColor('#666666')
                .text(`Certificato n° ${data.certificateNumber}`, 70, footerY, {
                    align: 'left',
                })

            doc
                .fontSize(9)
                .text(formatDate(data.completionDate), 70, footerY + 15, {
                    align: 'left',
                })

            // Center: Signature
            const centerX = pageWidth / 2
            doc
                .fontSize(11)
                .font('Helvetica-Bold')
                .fillColor('#000000')
                .text(settings.signerName, centerX - 100, footerY + 20, {
                    align: 'center',
                    width: 200,
                })

            doc
                .fontSize(9)
                .font('Helvetica')
                .fillColor('#666666')
                .text(settings.signerTitle, centerX - 100, footerY + 35, {
                    align: 'center',
                    width: 200,
                })

            // Signature line
            doc
                .moveTo(centerX - 80, footerY + 18)
                .lineTo(centerX + 80, footerY + 18)
                .lineWidth(1)
                .stroke('#CCCCCC')

            // Right side: QR Code for verification
            const qrSize = 80
            const qrX = pageWidth - 150
            const qrY = footerY - 20

            // Generate QR code with verification URL
            const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${data.verificationCode}`
            const qrDataURL = await generateQRCodeDataURL(verificationUrl)

            // Convert data URL to buffer and embed
            const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64')
            doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

            doc
                .fontSize(8)
                .fillColor('#666666')
                .text('Scansiona per verificare', qrX - 10, qrY + qrSize + 5, {
                    align: 'center',
                    width: qrSize + 20,
                })

            // Company name at bottom
            doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(settings.primaryColor)
                .text(settings.companyName, 0, pageHeight - 40, {
                    align: 'center',
                    width: pageWidth,
                })

            // Finalize PDF
            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}
