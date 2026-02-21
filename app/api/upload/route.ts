import { writeFile, mkdir } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { auth } from '@/lib/auth'

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
    try {
        // Authentication check
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autenticato" },
                { status: 401 }
            )
        }

        // Role check - only admins can upload
        if (session.user.role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Non autorizzato" },
                { status: 403 }
            )
        }

        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ success: false, message: "Nessun file caricato" }, { status: 400 })
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, message: `File troppo grande. Dimensione massima: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
                { status: 400 }
            )
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: `Tipo di file non consentito. Tipi ammessi: PDF, JPEG, PNG, GIF, WebP, SVG` },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure unique filename with sanitization
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`
        const uploadDir = path.join(process.cwd(), 'public/uploads')

        // Create dir if not exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if exists
        }

        const filepath = path.join(uploadDir, filename)
        await writeFile(filepath, buffer)

        return NextResponse.json({
            success: true,
            url: `/uploads/${filename}`,
            filename: file.name
        })
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json({ success: false, message: "Errore durante l'upload" }, { status: 500 })
    }
}
