"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getNotifications() {
    const session = await auth()
    if (!session?.user) return []

    try {
        const notifications = await db.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        })
        return notifications
    } catch (error) {
        console.error("Error fetching notifications:", error)
        return []
    }
}

export async function getUnreadNotificationCount() {
    const session = await auth()
    if (!session?.user) return 0

    try {
        const count = await db.notification.count({
            where: {
                userId: session.user.id,
                isRead: false
            }
        })
        return count
    } catch (_error) {
        return 0
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const session = await auth()
    if (!session?.user) return { success: false }

    try {
        await db.notification.update({
            where: {
                id: notificationId,
                userId: session.user.id
            },
            data: { isRead: true }
        })
        revalidatePath("/")
        return { success: true }
    } catch (_error) {
        return { success: false }
    }
}

export async function markAllNotificationsAsRead() {
    const session = await auth()
    if (!session?.user) return { success: false }

    try {
        await db.notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false
            },
            data: { isRead: true }
        })
        revalidatePath("/")
        return { success: true }
    } catch (_error) {
        return { success: false }
    }
}

export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "NEW_COURSE" | "DEADLINE_REMINDER" | "COMMENT_REPLY" | "CERTIFICATE_READY" | "QUIZ_GRADED" = "INFO",
    link?: string,
    icon?: string
) {
    // Internal use only, no auth check needed (called by other actions)
    try {
        await db.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link,
                icon
            }
        })
        return { success: true }
    } catch (error) {
        console.error("Error creating notification:", error)
        return { success: false }
    }
}
