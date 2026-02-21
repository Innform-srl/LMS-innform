"use client"

import { useEffect, useState } from "react"
import { NotificationItem } from "./notification-item"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiUrl } from "@/lib/api"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    icon: string | null
    isRead: boolean
    link: string | null
    createdAt: string
}

export function NotificationList({ onClose }: { onClose: () => void }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch(apiUrl('/api/notifications'))
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        try {
            await fetch(apiUrl(`/api/notifications/${id}/read`), {
                method: 'POST'
            })
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            )
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Nessuna notifica</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-96">
            <div className="divide-y">
                {notifications.map((notification) => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onClose={onClose}
                    />
                ))}
            </div>
        </ScrollArea>
    )
}
