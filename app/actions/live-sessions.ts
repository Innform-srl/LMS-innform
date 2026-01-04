"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getLiveSessions() {
    const session = await auth()
    if (!session?.user) return []

    const liveSessions = await db.liveSession.findMany({
        where: {
            course: {
                enrollments: {
                    some: {
                        userId: session.user.id
                    }
                }
            }
        },
        orderBy: { startTime: 'asc' },
        include: {
            course: {
                select: { title: true }
            },
            instructor: {
                select: { name: true, email: true }
            },
            module: {
                select: { id: true }
            }
        }
    })

    return liveSessions
}

export async function getAllLiveSessions() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    const liveSessions = await db.liveSession.findMany({
        orderBy: { startTime: 'asc' },
        include: {
            course: {
                select: { title: true }
            },
            instructor: {
                select: { name: true, email: true }
            },
            module: {
                select: { id: true }
            }
        }
    })

    return liveSessions
}

export async function getUpcomingSessions() {
    const session = await auth()
    if (!session?.user) return []

    const now = new Date()

    const liveSessions = await db.liveSession.findMany({
        where: {
            endTime: {
                gte: now
            },
            course: {
                enrollments: {
                    some: {
                        userId: session.user.id
                    }
                }
            }
        },
        orderBy: { startTime: 'asc' },
        include: {
            course: {
                select: { title: true }
            },
            instructor: {
                select: { name: true }
            },
            module: {
                select: { id: true }
            }
        },
        take: 5
    })

    return liveSessions
}

export async function createLiveSession(data: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
    meetingUrl: string
    courseId?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await db.liveSession.create({
        data: {
            title: data.title,
            description: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            meetingUrl: data.meetingUrl,
            courseId: data.courseId || null,
            instructorId: session.user.id
        }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}

export async function updateLiveSession(id: string, data: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
    meetingUrl: string
    courseId?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await db.liveSession.update({
        where: { id },
        data
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}

export async function deleteLiveSession(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await db.liveSession.delete({
        where: { id }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}
