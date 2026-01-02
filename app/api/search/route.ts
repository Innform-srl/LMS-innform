import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get("q")
        const departmentId = searchParams.get("departmentId")
        const minDuration = searchParams.get("minDuration")
        const maxDuration = searchParams.get("maxDuration")
        const sort = searchParams.get("sort") || "newest" // newest, oldest, title-asc, title-desc

        const whereClause: Prisma.CourseWhereInput = {
            published: true,
            AND: []
        }

        // Text search
        if (query) {
            (whereClause.AND as Prisma.CourseWhereInput[]).push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            })
        }

        // Department filter
        if (departmentId) {
            (whereClause.AND as Prisma.CourseWhereInput[]).push({
                departmentId: departmentId
            })
        }

        // Duration filter (in minutes)
        if (minDuration) {
            (whereClause.AND as Prisma.CourseWhereInput[]).push({
                minimumDuration: { gte: parseInt(minDuration) }
            })
        }
        if (maxDuration) {
            (whereClause.AND as Prisma.CourseWhereInput[]).push({
                minimumDuration: { lte: parseInt(maxDuration) }
            })
        }

        // Sorting
        let orderBy: Prisma.CourseOrderByWithRelationInput = { createdAt: 'desc' }
        switch (sort) {
            case 'oldest':
                orderBy = { createdAt: 'asc' }
                break
            case 'title-asc':
                orderBy = { title: 'asc' }
                break
            case 'title-desc':
                orderBy = { title: 'desc' }
                break
            case 'duration-asc':
                orderBy = { minimumDuration: 'asc' }
                break
            case 'duration-desc':
                orderBy = { minimumDuration: 'desc' }
                break
        }

        const courses = await db.course.findMany({
            where: whereClause,
            orderBy,
            include: {
                department: true,
                _count: {
                    select: {
                        modules: true,
                        enrollments: true
                    }
                }
            }
        })

        return NextResponse.json(courses)
    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
