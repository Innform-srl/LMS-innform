import { db } from "@/lib/db"

export async function createNotification(userId: string, title: string, message: string, link?: string) {
    try {
        await db.notification.create({
            data: {
                userId,
                title,
                message,
                link
            }
        })
    } catch (error) {
        console.error("Failed to create notification:", error)
    }
}
