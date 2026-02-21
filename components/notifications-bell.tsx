'use client'

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { apiUrl } from "@/lib/api"

type Notification = {
    id: string
    title: string
    message: string
    isRead: boolean
    link?: string
    createdAt: string
}

export function NotificationsBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        fetchNotifications()
        // Poll every minute
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    async function fetchNotifications() {
        try {
            const res = await fetch(apiUrl('/api/notifications'))
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
                setUnreadCount(data.filter((n: Notification) => !n.isRead).length)
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        }
    }

    async function markAsRead(id: string) {
        try {
            await fetch(apiUrl('/api/notifications'), {
                method: 'PATCH',
                body: JSON.stringify({ id })
            })
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark as read", error)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-gray-900 border-white/10 text-white">
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                        Nessuna notifica
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={`p-4 border-b border-white/5 focus:bg-white/5 cursor-pointer ${!notification.isRead ? 'bg-white/5' : ''}`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="space-y-1">
                                <div className="flex justify-between items-start">
                                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-gray-400'}`}>
                                        {notification.title}
                                    </p>
                                    {!notification.isRead && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                    {notification.message}
                                </p>
                                {notification.link && (
                                    <Link href={notification.link} className="text-xs text-blue-400 hover:underline block mt-2">
                                        Vedi dettagli
                                    </Link>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
