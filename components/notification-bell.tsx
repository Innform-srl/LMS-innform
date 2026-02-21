"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationList } from "./notification-list"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    // Fetch unread count
    useEffect(() => {
        fetchUnreadCount()
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch(apiUrl('/api/notifications/unread-count'))
            if (res.ok) {
                const data = await res.json()
                setUnreadCount(data.count)
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error)
        }
    }

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch(apiUrl('/api/notifications/mark-all-read'), {
                method: 'POST'
            })
            if (res.ok) {
                setUnreadCount(0)
                router.refresh()
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifiche</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="text-xs"
                        >
                            Segna tutto come letto
                        </Button>
                    )}
                </div>
                <NotificationList onClose={() => setIsOpen(false)} />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
