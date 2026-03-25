/**
 * EduPlan Course Creation Endpoint
 * Creates a new course on the LMS from SafeInnform
 *
 * POST /api/eduplan/courses/create
 * Headers:
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 *
 * Body:
 *   - title: string (required)
 *   - description?: string
 *   - minimumDuration?: number (minutes)
 *   - isRequired?: boolean
 *   - dueInDays?: number
 *   - published?: boolean (default false)
 *   - tms_course_id?: string (SafeInnform course ID for auto-mapping)
 *   - tms_course_code?: string (SafeInnform course code for auto-mapping)
 *
 * Returns:
 *   - { success: true, id: string, title: string, mapping_id?: string }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/security";

const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization, X-TMS-Signature, X-TMS-Timestamp",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

interface CreateCoursePayload {
    title: string;
    description?: string;
    minimumDuration?: number;
    isRequired?: boolean;
    dueInDays?: number;
    published?: boolean;
    tms_course_id?: string;
    tms_course_code?: string;
}

function verifySignature(signature: string | null, body: string, timestamp: string | null): boolean {
    if (!signature || !LMS_WEBHOOK_SECRET) {
        console.error("[EDUPLAN COURSES/CREATE] Missing signature or secret");
        return false;
    }

    if (timestamp) {
        const webhookTime = new Date(timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - webhookTime) > fiveMinutes) {
            console.error("[EDUPLAN COURSES/CREATE] Timestamp too old");
            return false;
        }
    }

    const expectedSignature = crypto.createHmac("sha256", LMS_WEBHOOK_SECRET).update(body).digest("hex");

    const expectedWithPrefix = `sha256=${expectedSignature}`;

    try {
        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedWithPrefix);

        if (sigBuffer.length !== expectedBuffer.length) {
            const expectedBufferNaked = Buffer.from(expectedSignature);
            if (sigBuffer.length === expectedBufferNaked.length) {
                return crypto.timingSafeEqual(sigBuffer, expectedBufferNaked);
            }
            return false;
        }

        return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
        return false;
    }
}

export async function POST(req: Request) {
    const requestId = crypto.randomUUID();

    try {
        // Rate limiting
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rateLimit = await checkRateLimit(`eduplan:courses:create:${ip}`, 30, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { success: false, error: "Too many requests" },
                { status: 429, headers: corsHeaders }
            );
        }

        // Parse body
        const bodyText = await req.text();
        let payload: CreateCoursePayload;

        try {
            payload = JSON.parse(bodyText);
        } catch {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify HMAC signature
        const signature = req.headers.get("x-tms-signature");
        const timestamp = req.headers.get("x-tms-timestamp");

        if (!verifySignature(signature, bodyText, timestamp)) {
            console.error("[EDUPLAN COURSES/CREATE] Invalid signature");
            return NextResponse.json(
                { success: false, error: "Invalid webhook signature" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Validate required fields
        if (!payload.title || payload.title.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: "Missing required field: title" },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log("[EDUPLAN COURSES/CREATE] Creating course:", {
            requestId,
            title: payload.title,
            tms_course_id: payload.tms_course_id,
            tms_course_code: payload.tms_course_code,
        });

        // Create the course
        const course = await db.course.create({
            data: {
                title: payload.title.trim(),
                description: payload.description?.trim() || null,
                minimumDuration: payload.minimumDuration ?? 0,
                isRequired: payload.isRequired ?? false,
                dueInDays: payload.dueInDays ?? null,
                published: payload.published ?? false,
            },
        });

        // Create TMS mapping if tms_course_id provided
        let mappingId: string | null = null;
        if (payload.tms_course_id) {
            const mapping = await db.courseTMSMapping.create({
                data: {
                    courseId: course.id,
                    tmsCourseId: payload.tms_course_id,
                    tmsCourseCode: payload.tms_course_code ?? null,
                    syncEnabled: true,
                    lastSyncAt: new Date(),
                },
            });
            mappingId = mapping.id;
        }

        // Log webhook event
        try {
            await db.webhookEvent.create({
                data: {
                    source: "eduplan",
                    eventType: "course_created",
                    direction: "incoming",
                    status: "success",
                    requestPayload: {
                        title: payload.title,
                        description: payload.description,
                        tms_course_id: payload.tms_course_id,
                        tms_course_code: payload.tms_course_code,
                    },
                    responsePayload: {
                        id: course.id,
                        mapping_id: mappingId,
                        success: true,
                    },
                    processedAt: new Date(),
                },
            });
        } catch (logError) {
            console.error("[EDUPLAN COURSES/CREATE] Failed to log webhook event:", logError);
        }

        console.log("[EDUPLAN COURSES/CREATE] Course created:", {
            requestId,
            courseId: course.id,
            title: course.title,
            mappingId,
        });

        return NextResponse.json(
            {
                success: true,
                id: course.id,
                title: course.title,
                published: course.published,
                mapping_id: mappingId,
            },
            { status: 201, headers: corsHeaders }
        );
    } catch (error) {
        console.error("[EDUPLAN COURSES/CREATE] Error:", error);

        try {
            await db.webhookEvent.create({
                data: {
                    source: "eduplan",
                    eventType: "course_created",
                    direction: "incoming",
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                    processedAt: new Date(),
                },
            });
        } catch {
            // Ignore logging errors
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
                request_id: requestId,
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
