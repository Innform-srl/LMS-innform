"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { reportError } from "@/lib/error-reporting"

export async function getNotifications() {
    const check = await requireAuth()
    if (!check.authorized) return []
    const session = check.session

    try {
        const notifications = await db.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        })
        return notifications
    } catch (error) {
        console.error("Error fetching notifications:", error)
        reportError(error, { action: "getNotifications" })
        return []
    }
}

export async function getUnreadNotificationCount() {
    const check = await requireAuth()
    if (!check.authorized) return 0
    const session = check.session

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
    const check = await requireAuth()
    if (!check.authorized) return { success: false }
    const session = check.session

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
    const check = await requireAuth()
    if (!check.authorized) return { success: false }
    const session = check.session

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
        reportError(error, { action: "createNotification" })
        return { success: false }
    }
}
