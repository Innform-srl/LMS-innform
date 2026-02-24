"use client"

import { useRouter } from "next/navigation"
import * as Icons from "lucide-react"
import { cn, formatDateOnly } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    type?: string
    icon?: string | null
    isRead: boolean
    link?: string | null
    createdAt: string | Date
}

interface NotificationItemProps {
    notification: Notification
    onMarkAsRead: (id: string) => void
    onClose: () => void
}

const typeColors = {
    INFO: 'bg-blue-500/10 text-blue-500',
    SUCCESS: 'bg-green-500/10 text-green-500',
    WARNING: 'bg-yellow-500/10 text-yellow-500',
    ERROR: 'bg-red-500/10 text-red-500',
    NEW_COURSE: 'bg-primary/10 text-primary',
    DEADLINE_REMINDER: 'bg-orange-500/10 text-orange-500',
    COMMENT_REPLY: 'bg-cyan-500/10 text-cyan-500',
    CERTIFICATE_READY: 'bg-emerald-500/10 text-emerald-500',
    QUIZ_GRADED: 'bg-pink-500/10 text-pink-500',
}

export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
    const router = useRouter()

    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id)
        }
        if (notification.link) {
            router.push(notification.link)
            onClose()
        }
    }

    const getIcon = () => {
        if (notification.icon) {
            const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[notification.icon]
            if (IconComponent) {
                return <IconComponent className="w-5 h-5" />
            }
        }
        // Default icons based on type
        const defaultIcons: Record<string, React.ComponentType<{ className?: string }>> = {
            NEW_COURSE: Icons.BookOpen,
            DEADLINE_REMINDER: Icons.Clock,
            COMMENT_REPLY: Icons.MessageCircle,
            CERTIFICATE_READY: Icons.Award,
            QUIZ_GRADED: Icons.CheckCircle2,
            SUCCESS: Icons.CheckCircle2,
            WARNING: Icons.AlertTriangle,
            ERROR: Icons.XCircle,
            INFO: Icons.Info,
        }
        const DefaultIcon = defaultIcons[notification.type || 'INFO'] || Icons.Bell
        return <DefaultIcon className="w-5 h-5" />
    }

    const timeAgo = (date: string | Date) => {
        const now = new Date()
        const then = new Date(date)
        const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

        if (seconds < 60) return 'Ora'
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}g fa`
        return formatDateOnly(then)
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                "w-full text-left p-4 hover:bg-accent/50 cursor-pointer transition-colors",
                !notification.isRead && "bg-primary/5"
            )}
        >
            <div className="flex gap-3">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    typeColors[(notification.type || 'INFO') as keyof typeof typeColors] || typeColors.INFO
                )}>
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                            "font-medium text-sm truncate",
                            !notification.isRead && "font-semibold"
                        )}>
                            {notification.title}
                        </h4>
                        {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                        {timeAgo(notification.createdAt)}
                    </span>
                </div>
            </div>
        </button>
    )
}
