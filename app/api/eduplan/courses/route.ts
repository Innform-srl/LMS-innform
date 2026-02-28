import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { effectivelyPublishedModuleWhere } from "@/lib/module-utils";

// Validate API key from request
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedKey = process.env.EDUPLAN_API_KEY;

  if (!expectedKey) {
    console.error("EDUPLAN_API_KEY not configured");
    return false;
  }

  return apiKey === expectedKey;
}

// GET /api/eduplan/courses - Returns list of courses for EduPlan
export async function GET(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeModules = searchParams.get("include_modules") === "true";
    const publishedOnly = searchParams.get("published_only") !== "false"; // default true
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const courses = await db.course.findMany({
      where: publishedOnly ? { published: true, archived: false } : { archived: false },
      include: {
        modules: includeModules ? {
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
          }
        } : false,
        _count: {
          select: {
            enrollments: true,
            modules: true,
          }
        }
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
    const formattedCourses = courses.map(course => ({
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
      ...(includeModules && course.modules ? { modules: course.modules } : {}),
    }));

    return NextResponse.json({
      success: true,
      data: {
        courses: formattedCourses,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + courses.length < totalCount,
        }
      },
      meta: {
        lmsVersion: "1.0",
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Error fetching courses for EduPlan:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
