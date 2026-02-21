import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        const { content, courseId, moduleId, parentId } = await req.json()

        if (!content) return new NextResponse("Content required", { status: 400 })

        const comment = await db.comment.create({
            data: {
                content,
                userId: session.user.id,
                courseId,
                moduleId,
                parentId
            }
        })

        return NextResponse.json(comment)
    } catch (error) {
        console.error("[COMMENTS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get("courseId")
        const moduleId = searchParams.get("moduleId")

        const comments = await db.comment.findMany({
            where: {
                courseId: courseId || undefined,
                moduleId: moduleId || undefined,
                parentId: null // Only fetch top-level comments
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        // image: true // Assuming image field exists or will exist
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(comments)
    } catch (error) {
        console.error("[COMMENTS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
