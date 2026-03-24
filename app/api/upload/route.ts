import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SUPABASE_URL = "https://vcehpsfhhdqoovwvsytp.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const BUCKET = "uploads";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
    try {
        // Authentication check
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Non autenticato" }, { status: 401 });
        }

        // Role check - only admins can upload
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Non autorizzato" }, { status: 403 });
        }

        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, message: "Nessun file caricato" }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    message: `File troppo grande. Dimensione massima: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                },
                { status: 400 }
            );
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Tipo di file non consentito. Tipi ammessi: PDF, JPEG, PNG, GIF, WebP, SVG`,
                },
                { status: 400 }
            );
        }

        // Unique filename
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;

        const bytes = await file.arrayBuffer();

        // Upload to Supabase Storage
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                apikey: SUPABASE_ANON_KEY,
                "Content-Type": file.type,
            },
            body: bytes,
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            console.error("Supabase Storage upload error:", uploadRes.status, err);
            return NextResponse.json({ success: false, message: "Errore durante l'upload del file" }, { status: 500 });
        }

        // Public URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: file.name,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: "Errore durante l'upload" }, { status: 500 });
    }
}
