"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getLiveSessions() {
    const session = await auth()
    if (!session?.user) return []

    const liveSessions = await db.liveSession.findMany({
        where: {
            hiddenFromStudents: false,
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
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

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
            hiddenFromStudents: false,
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

function extractGoogleMeetCode(url: string): string | null {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
    return match ? match[1] : null
}

export async function createLiveSession(data: {
    title: string
    description?: string
    startTime?: Date
    endTime?: Date
    meetingUrl?: string
    courseId?: string
}) {
    const session = await auth()
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    const googleMeetCode = data.meetingUrl ? extractGoogleMeetCode(data.meetingUrl) : null

    await db.liveSession.create({
        data: {
            title: data.title,
            description: data.description,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            meetingUrl: data.meetingUrl || null,
            googleMeetCode,
            courseId: data.courseId || null,
            instructorId: session.user.id
        }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}

export async function getLiveSessionById(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return null

    return db.liveSession.findUnique({
        where: { id },
        include: {
            course: { select: { id: true, title: true } },
            instructor: { select: { name: true, email: true } },
        },
    })
}

export async function updateLiveSession(id: string, data: {
    title: string
    description?: string
    startTime?: Date
    endTime?: Date
    meetingUrl?: string
    courseId?: string
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        throw new Error("Unauthorized")
    }

    const googleMeetCode = data.meetingUrl ? extractGoogleMeetCode(data.meetingUrl) : null

    await db.liveSession.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description || null,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            meetingUrl: data.meetingUrl || null,
            googleMeetCode,
            courseId: data.courseId || null,
        }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}

export async function toggleSessionVisibility(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        throw new Error("Unauthorized")
    }

    const liveSession = await db.liveSession.findUnique({
        where: { id },
        select: { hiddenFromStudents: true }
    })

    if (!liveSession) throw new Error("Session not found")

    await db.liveSession.update({
        where: { id },
        data: { hiddenFromStudents: !liveSession.hiddenFromStudents }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}

export async function deleteLiveSession(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
        throw new Error("Unauthorized")
    }

    await db.liveSession.delete({
        where: { id }
    })

    revalidatePath("/admin/live-sessions")
    revalidatePath("/dashboard")
    revalidatePath("/live-sessions")
}
