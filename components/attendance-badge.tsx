"use client"

import { Badge } from "@/components/ui/badge"
import { AttendanceStatus } from "@prisma/client"

interface AttendanceBadgeProps {
    status: AttendanceStatus
    size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<AttendanceStatus, {
    label: string
    className: string
    icon: string
}> = {
    REGISTERED: {
        label: "Registrato",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: "📝"
    },
    PRESENT: {
        label: "Presente",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: "✅"
    },
    ATTENDED: {
        label: "Completato",
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        icon: "🎯"
    },
    ABSENT: {
        label: "Assente",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
        icon: "❌"
    },
    LATE: {
        label: "In ritardo",
        className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        icon: "⏰"
    },
    EXCUSED: {
        label: "Giustificato",
        className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        icon: "📋"
    }
}

export function AttendanceBadge({ status, size = 'md' }: AttendanceBadgeProps) {
    const config = statusConfig[status]
    const sizeClass = size === 'sm'
        ? 'text-xs px-2 py-0.5'
        : size === 'lg'
            ? 'text-base px-4 py-2'
            : 'text-sm px-3 py-1'

    return (
        <Badge className={`${config.className} ${sizeClass}`}>
            {config.icon} {config.label}
        </Badge>
    )
}

interface AttendanceDotProps {
    status: AttendanceStatus
    size?: 'sm' | 'md' | 'lg'
    showTooltip?: boolean
}

const dotColors: Record<AttendanceStatus, string> = {
    REGISTERED: "bg-blue-500",
    PRESENT: "bg-green-500",
    ATTENDED: "bg-emerald-500",
    ABSENT: "bg-red-500",
    LATE: "bg-orange-500",
    EXCUSED: "bg-gray-500"
}

export function AttendanceDot({ status, size = 'md', showTooltip = true }: AttendanceDotProps) {
    const config = statusConfig[status]
    const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

    return (
        <div
            className={`${dotColors[status]} ${sizeClass} rounded-full`}
            title={showTooltip ? config.label : undefined}
        />
    )
}
