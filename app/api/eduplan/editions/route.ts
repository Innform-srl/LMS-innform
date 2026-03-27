/**
 * EduPlan Editions Endpoint
 * Allows SafeInnform to create and list editions for LMS courses
 *
 * POST /api/eduplan/editions — Create a new edition (HMAC auth)
 * GET  /api/eduplan/editions?course_id={id} — List editions (API Key auth)
 *
 * Headers (POST):
 *   - X-TMS-Signature: sha256=<HMAC-SHA256 of body>
 *   - X-TMS-Timestamp: <ISO timestamp>
 *
 * Headers (GET):
 *   - X-API-Key: <API key>
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/security";

const LMS_WEBHOOK_SECRET = process.env.LMS_WEBHOOK_SECRET;

const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, X-API-Key, Authorization, X-TMS-Signature, X-TMS-Timestamp",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

interface CreateEditionPayload {
    course_id: string;
    code: string;
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    max_participants?: number;
    status?: string;
    published?: boolean;
    tms_edition_id?: string;
    tms_classe_id?: string;
}

function verifySignature(
    signature: string | null,
    body: string,
    timestamp: string | null
): boolean {
    if (!signature || !LMS_WEBHOOK_SECRET) {
        console.error("[EDUPLAN EDITIONS] Missing signature or secret");
        return false;
    }

    if (timestamp) {
        const webhookTime = new Date(timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - webhookTime) > fiveMinutes) {
            console.error("[EDUPLAN EDITIONS] Timestamp too old");
            return false;
        }
    }

    const expectedSignature = crypto
        .createHmac("sha256", LMS_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

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

function validateApiKey(request: NextRequest): boolean {
    const apiKey =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedKey = process.env.EDUPLAN_API_KEY;

    if (!expectedKey) {
        console.error("[EDUPLAN EDITIONS] EDUPLAN_API_KEY not configured");
        return false;
    }

    return apiKey === expectedKey;
}

/**
 * GET /api/eduplan/editions?course_id={id}
 * List editions for a course
 */
export async function GET(request: NextRequest) {
    if (!validateApiKey(request)) {
        return NextResponse.json(
            {
                success: false,
                error: "Unauthorized",
                message: "Invalid or missing API key",
            },
            { status: 401, headers: corsHeaders }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("course_id");

        if (!courseId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required parameter: course_id",
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify course exists
        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { id: true, title: true },
        });

        if (!course) {
            return NextResponse.json(
                { success: false, error: "Course not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        const editions = await db.edition.findMany({
            where: { courseId },
            include: {
                _count: {
                    select: { enrollments: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const formattedEditions = editions.map((edition) => ({
            id: edition.id,
            code: edition.code,
            title: edition.title,
            description: edition.description,
            status: edition.status,
            published: edition.published,
            startDate: edition.startDate?.toISOString() || null,
            endDate: edition.endDate?.toISOString() || null,
            maxParticipants: edition.maxParticipants,
            totalEnrollments: edition._count.enrollments,
            tmsEditionId: edition.tmsEditionId,
            tmsClasseId: edition.tmsClasseId,
            createdAt: edition.createdAt.toISOString(),
        }));

        return NextResponse.json(
            {
                success: true,
                data: {
                    course_id: courseId,
                    course_title: course.title,
                    editions: formattedEditions,
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    totalCount: formattedEditions.length,
                },
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("[EDUPLAN EDITIONS] GET Error:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * POST /api/eduplan/editions
 * Create a new edition for a course
 */
export async function POST(req: Request) {
    const requestId = crypto.randomUUID();

    try {
        // Rate limiting
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rateLimit = await checkRateLimit(
            `eduplan:editions:create:${ip}`,
            RATE_LIMIT_REQUESTS,
            RATE_LIMIT_WINDOW_MS
        );
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { success: false, error: "Too many requests" },
                { status: 429, headers: corsHeaders }
            );
        }

        // Parse body
        const bodyText = await req.text();
        let payload: CreateEditionPayload;

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
            console.error("[EDUPLAN EDITIONS] Invalid signature");
            return NextResponse.json(
                { success: false, error: "Invalid webhook signature" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Validate required fields
        if (!payload.course_id) {
            return NextResponse.json(
                { success: false, error: "Missing required field: course_id" },
                { status: 400, headers: corsHeaders }
            );
        }
        if (!payload.code) {
            return NextResponse.json(
                { success: false, error: "Missing required field: code" },
                { status: 400, headers: corsHeaders }
            );
        }
        if (!payload.title) {
            return NextResponse.json(
                { success: false, error: "Missing required field: title" },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify course exists
        const course = await db.course.findUnique({
            where: { id: payload.course_id },
            select: { id: true, title: true },
        });

        if (!course) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Course not found",
                    code: "COURSE_NOT_FOUND",
                    requested_course_id: payload.course_id,
                },
                { status: 404, headers: corsHeaders }
            );
        }

        console.log("[EDUPLAN EDITIONS] Creating edition:", {
            requestId,
            courseId: payload.course_id,
            code: payload.code,
            title: payload.title,
            tmsEditionId: payload.tms_edition_id,
        });

        // Check if edition with same code already exists for this course (idempotent)
        const existingEdition = await db.edition.findUnique({
            where: {
                courseId_code: {
                    courseId: payload.course_id,
                    code: payload.code,
                },
            },
        });

        if (existingEdition) {
            // Update existing edition
            const updated = await db.edition.update({
                where: { id: existingEdition.id },
                data: {
                    title: payload.title.trim(),
                    description: payload.description?.trim() || null,
                    startDate: payload.start_date
                        ? new Date(payload.start_date)
                        : existingEdition.startDate,
                    endDate: payload.end_date
                        ? new Date(payload.end_date)
                        : existingEdition.endDate,
                    maxParticipants:
                        payload.max_participants ??
                        existingEdition.maxParticipants,
                    status: payload.status ?? existingEdition.status,
                    published: payload.published ?? existingEdition.published,
                    tmsEditionId:
                        payload.tms_edition_id ?? existingEdition.tmsEditionId,
                    tmsClasseId:
                        payload.tms_classe_id ?? existingEdition.tmsClasseId,
                    tmsSyncedAt: new Date(),
                },
            });

            console.log("[EDUPLAN EDITIONS] Edition updated (idempotent):", {
                requestId,
                editionId: updated.id,
                code: updated.code,
            });

            return NextResponse.json(
                {
                    success: true,
                    id: updated.id,
                    code: updated.code,
                    title: updated.title,
                    course_id: updated.courseId,
                    existing: true,
                    message: "Edition updated",
                },
                { status: 200, headers: corsHeaders }
            );
        }

        // Create new edition
        const edition = await db.edition.create({
            data: {
                courseId: payload.course_id,
                code: payload.code.trim(),
                title: payload.title.trim(),
                description: payload.description?.trim() || null,
                startDate: payload.start_date
                    ? new Date(payload.start_date)
                    : null,
                endDate: payload.end_date ? new Date(payload.end_date) : null,
                maxParticipants: payload.max_participants ?? 30,
                status: payload.status ?? "planned",
                published: payload.published ?? false,
                tmsEditionId: payload.tms_edition_id ?? null,
                tmsClasseId: payload.tms_classe_id ?? null,
                tmsSyncedAt: payload.tms_edition_id ? new Date() : null,
            },
        });

        // Log webhook event
        try {
            await db.webhookEvent.create({
                data: {
                    source: "safeinnform",
                    eventType: "edition_created",
                    direction: "incoming",
                    status: "success",
                    requestPayload: {
                        course_id: payload.course_id,
                        code: payload.code,
                        title: payload.title,
                        tms_edition_id: payload.tms_edition_id,
                        tms_classe_id: payload.tms_classe_id,
                    },
                    responsePayload: {
                        id: edition.id,
                        success: true,
                    },
                    processedAt: new Date(),
                },
            });
        } catch (logError) {
            console.error(
                "[EDUPLAN EDITIONS] Failed to log webhook event:",
                logError
            );
        }

        console.log("[EDUPLAN EDITIONS] Edition created:", {
            requestId,
            editionId: edition.id,
            code: edition.code,
            title: edition.title,
            courseId: edition.courseId,
        });

        return NextResponse.json(
            {
                success: true,
                id: edition.id,
                code: edition.code,
                title: edition.title,
                course_id: edition.courseId,
            },
            { status: 201, headers: corsHeaders }
        );
    } catch (error) {
        console.error("[EDUPLAN EDITIONS] Error:", error);

        try {
            await db.webhookEvent.create({
                data: {
                    source: "safeinnform",
                    eventType: "edition_created",
                    direction: "incoming",
                    status: "failed",
                    errorMessage:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    processedAt: new Date(),
                },
            });
        } catch {
            // Ignore logging errors
        }

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
                request_id: requestId,
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
