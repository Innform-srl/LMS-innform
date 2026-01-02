import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import PDFDocument from 'pdfkit'
import { generateQRCodeDataURL, formatDate, loadFont } from '@/lib/certificate-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { attemptId } = await params

    const attempt = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!attempt || attempt.userId !== session.user.id || !attempt.passed) {
      return new NextResponse("Not Found", { status: 404 })
    }

    // Get certificate settings (or use defaults)
    const settings = await db.certificateSettings.findFirst() || {
      companyName: "LMS Innform",
      primaryColor: "#6366f1",
      accentColor: "#8b5cf6",
      headerText: "Certificato di Superamento Quiz",
      signerName: "Il Team",
      signerTitle: "LMS Innform",
    }

    // Load fonts
    const [regularFont, boldFont] = await Promise.all([
      loadFont('regular'),
      loadFont('bold')
    ])

    // Create PDF
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0
    })

    // Register fonts
    doc.registerFont('Roboto', regularFont)
    doc.registerFont('Roboto-Bold', boldFont)

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    return new Promise<NextResponse>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Certificato-Quiz-${attempt.quiz.title.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
            },
          })
        )
      })

      doc.on('error', (err) => {
        reject(err)
      })

      // --- PDF Content Generation ---

      // Background / Border
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff')

      // Decorative border
      doc.lineWidth(20)
        .strokeColor(settings.primaryColor)
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke()

      // Header
      doc.moveDown(2)
      doc.font('Roboto-Bold')
        .fontSize(40)
        .fillColor(settings.primaryColor)
        .text("Certificato di Superamento Quiz", 0, 100, { align: 'center' })

      // Subtitle
      doc.moveDown(0.5)
      doc.font('Roboto')
        .fontSize(16)
        .fillColor('#666666')
        .text('Questo documento certifica che', { align: 'center' })

      // User Name
      doc.moveDown(1)
      doc.font('Roboto-Bold')
        .fontSize(32)
        .fillColor('#000000')
        .text(attempt.user.name || attempt.user.email, { align: 'center' })

      // Quiz Info
      doc.moveDown(0.5)
      doc.font('Roboto')
        .fontSize(16)
        .fillColor('#666666')
        .text('ha superato con successo il quiz', { align: 'center' })

      doc.moveDown(0.5)
      doc.font('Roboto-Bold')
        .fontSize(24)
        .fillColor(settings.accentColor)
        .text(attempt.quiz.title, { align: 'center' })

      // Course Info
      if (attempt.quiz.module?.course?.title) {
        doc.moveDown(0.5)
        doc.font('Roboto')
          .fontSize(14)
          .fillColor('#666666')
          .text(`del corso ${attempt.quiz.module.course.title}`, { align: 'center' })
      }

      // Score
      doc.moveDown(1)
      doc.font('Roboto-Bold')
        .fontSize(18)
        .fillColor(settings.primaryColor)
        .text(`Punteggio: ${attempt.score}%`, { align: 'center' })

      // Date
      doc.moveDown(0.5)
      doc.font('Roboto')
        .fontSize(14)
        .fillColor('#666666')
        .text(`in data ${formatDate(attempt.completedAt)}`, { align: 'center' })

      // Signatures & Footer
      const bottomY = doc.page.height - 150

      // Left: Certificate Number & QR
      doc.fontSize(10)
        .fillColor('#999999')
        .text(`ID Tentativo: ${attempt.id}`, 60, bottomY)

      doc.text(`Rilasciato da: ${settings.companyName}`, 60, bottomY + 15)

      // Right: Signature
      doc.fontSize(14)
        .fillColor('#000000')
        .text(settings.signerName, doc.page.width - 250, bottomY, { width: 200, align: 'center' })

      doc.fontSize(10)
        .fillColor('#666666')
        .text(settings.signerTitle, doc.page.width - 250, bottomY + 20, { width: 200, align: 'center' })

      // Generate QR Code (pointing to the quiz result page or just the ID)
      generateQRCodeDataURL(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/quiz/${attempt.quiz.id}/results/${attempt.id}`)
        .then(qrDataUrl => {
          doc.image(qrDataUrl, 60, bottomY + 40, { width: 80 })
          doc.end()
        })
        .catch(err => {
          console.error("QR Gen Error", err)
          doc.end()
        })
    })

  } catch (error) {
    console.error("Certificate generation error:", error)
    return new NextResponse(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 })
  }
}
