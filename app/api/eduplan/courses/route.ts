import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization, X-TMS-Signature, X-TMS-Timestamp",
};

// Handle CORS preflight
export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

// Validate API key from request
function validateApiKey(request: NextRequest | Request): boolean {
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedKey = process.env.EDUPLAN_API_KEY;

    if (!expectedKey) {
        console.error("EDUPLAN_API_KEY not configured");
        return false;
    }

    return apiKey === expectedKey;
}

// GET /api/eduplan/courses - Returns list of courses with TMS mapping codes
export async function GET(request: NextRequest) {
    // Validate API key
    if (!validateApiKey(request)) {
        return NextResponse.json(
            { error: "Unauthorized", message: "Invalid or missing API key" },
            { status: 401, headers: corsHeaders }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const includeModules = searchParams.get("include_modules") === "true";
        const includeEditions = searchParams.get("include_editions") === "true";
        const publishedOnly = searchParams.get("published_only") !== "false"; // default true
        const limit = parseInt(searchParams.get("limit") || "100");
        const offset = parseInt(searchParams.get("offset") || "0");

        const courses = await db.course.findMany({
            where: publishedOnly ? { published: true, archived: false } : { archived: false },
            include: {
                modules: includeModules
                    ? {
                          where: publishedOnly ? effectivelyPublishedModuleWhere() : {},
                          orderBy: { position: "asc" },
                          select: {
                              id: true,
                              title: true,
                              description: true,
                              position: true,
                              contentType: true,
                              videoDuration: true,
                              minimumDuration: true,
                              totalPages: true,
                          },
                      }
                    : false,
                tmsMappings: {
                    where: { syncEnabled: true },
                    select: {
                        tmsCourseId: true,
                        tmsCourseCode: true,
                    },
                },
                editions: includeEditions
                    ? {
                          orderBy: { createdAt: "desc" as const },
                          select: {
                              id: true,
                              code: true,
                              title: true,
                              status: true,
                              startDate: true,
                              endDate: true,
                              maxParticipants: true,
                              _count: { select: { enrollments: true } },
                          },
                      }
                    : false,
                _count: {
                    select: {
                        enrollments: true,
                        modules: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        });

        // Get total count for pagination
        const totalCount = await db.course.count({
            where: publishedOnly ? { published: true, archived: false } : { archived: false },
        });

        // Transform to EduPlan-friendly format
        const formattedCourses = courses.map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            published: course.published,
            isRequired: course.isRequired,
            dueInDays: course.dueInDays,
            minimumDuration: course.minimumDuration,
            totalModules: course._count.modules,
            totalEnrollments: course._count.enrollments,
            createdAt: course.createdAt.toISOString(),
            updatedAt: course.updatedAt.toISOString(),
            // TMS mapping info for SafeInnform matching
            tmsCourseCode: course.tmsMappings[0]?.tmsCourseCode ?? null,
            tmsCourseId: course.tmsMappings[0]?.tmsCourseId ?? null,
            ...(includeModules && course.modules ? { modules: course.modules } : {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(includeEditions && (course as any).editions
                ? {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      editions: (course as any).editions.map((ed: any) => ({
                          id: ed.id,
                          code: ed.code,
                          title: ed.title,
                          status: ed.status,
                          startDate: ed.startDate?.toISOString() || null,
                          endDate: ed.endDate?.toISOString() || null,
                          maxParticipants: ed.maxParticipants,
                          totalEnrollments: ed._count?.enrollments ?? 0,
                      })),
                  }
                : {}),
        }));

        return NextResponse.json(
            {
                success: true,
                data: {
                    courses: formattedCourses,
                    pagination: {
                        total: totalCount,
                        limit,
                        offset,
                        hasMore: offset + courses.length < totalCount,
                    },
                },
                meta: {
                    lmsVersion: "1.0",
                    timestamp: new Date().toISOString(),
                },
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error fetching courses for EduPlan:", error);
        return NextResponse.json(
            {
                error: "Internal Server Error",
                message: "Failed to fetch courses",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

// POST /api/eduplan/courses - Create or update TMS course mapping
export async function POST(request: Request) {
    if (!validateApiKey(request as NextRequest)) {
        return NextResponse.json(
            { error: "Unauthorized", message: "Invalid or missing API key" },
            { status: 401, headers: corsHeaders }
        );
    }

    try {
        const payload = await request.json();
        const { course_id, tms_course_id, tms_course_code } = payload as {
            course_id: string;
            tms_course_id: string;
            tms_course_code?: string;
        };

        if (!course_id || !tms_course_id) {
            return NextResponse.json(
                {
                    error: "Bad Request",
                    message: "Missing required fields: course_id, tms_course_id",
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify course exists
        const course = await db.course.findUnique({
            where: { id: course_id },
            select: { id: true, title: true },
        });

        if (!course) {
            return NextResponse.json(
                { error: "Not Found", message: "Course not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        // Upsert mapping
        const mapping = await db.courseTMSMapping.upsert({
            where: {
                courseId_tmsCourseId: {
                    courseId: course_id,
                    tmsCourseId: tms_course_id,
                },
            },
            update: {
                tmsCourseCode: tms_course_code ?? null,
                syncEnabled: true,
                lastSyncAt: new Date(),
            },
            create: {
                courseId: course_id,
                tmsCourseId: tms_course_id,
                tmsCourseCode: tms_course_code ?? null,
                syncEnabled: true,
                lastSyncAt: new Date(),
            },
        });

        console.log("[EDUPLAN COURSES] Mapping created/updated:", {
            mappingId: mapping.id,
            courseId: course_id,
            courseTitle: course.title,
            tmsCourseId: tms_course_id,
            tmsCourseCode: tms_course_code,
        });

        return NextResponse.json(
            {
                success: true,
                mapping_id: mapping.id,
                course_title: course.title,
            },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error creating course mapping:", error);
        return NextResponse.json(
            {
                error: "Internal Server Error",
                message: "Failed to create course mapping",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
