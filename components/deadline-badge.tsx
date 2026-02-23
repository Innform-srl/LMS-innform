"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDateOnly } from "@/lib/utils"

interface DeadlineBadgeProps {
    dueDate: Date
    completed?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export function DeadlineBadge({ dueDate, completed = false, size = 'md' }: DeadlineBadgeProps) {
    if (completed) return null

    const now = new Date()
    const deadline = new Date(dueDate)
    const daysUntilDue = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Size classes
    const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'

    // Già scaduto
    if (daysUntilDue < 0) {
        return (
            <Badge variant="destructive" className={`animate-pulse ${sizeClass}`}>
                ❌ Scaduto {Math.abs(daysUntilDue)} giorni fa
            </Badge>
        )
    }

    // Scade oggi
    if (daysUntilDue === 0) {
        return (
            <Badge variant="destructive" className={`animate-pulse ${sizeClass}`}>
                🔴 Scade OGGI!
            </Badge>
        )
    }

    // Scade domani
    if (daysUntilDue === 1) {
        return (
            <Badge variant="destructive" className={sizeClass}>
                ⚠️ Scade DOMANI
            </Badge>
        )
    }

    // Scade tra 2-3 giorni
    if (daysUntilDue <= 3) {
        return (
            <Badge className={`bg-orange-500/20 text-orange-400 border-orange-500/30 ${sizeClass}`}>
                ⏰ Scade tra {daysUntilDue} giorni
            </Badge>
        )
    }

    // Scade tra 4-7 giorni
    if (daysUntilDue <= 7) {
        return (
            <Badge className={`bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ${sizeClass}`}>
                📅 Scade tra {daysUntilDue} giorni
            </Badge>
        )
    }

    // Più di 7 giorni
    return (
        <Badge variant="outline" className={`border-white/10 ${sizeClass}`}>
            📅 Scadenza: {formatDateOnly(deadline)}
        </Badge>
    )
}

interface DeadlineCardProps {
    courses: Array<{
        courseId: string
        courseTitle: string
        count: number
        nextDeadline: Date
    }>
}

export function UpcomingDeadlinesCard({ courses }: DeadlineCardProps) {
    if (courses.length === 0) {
        return null
    }

    return (
        <Card className="glass border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold">Scadenze Imminenti</h3>
                    <p className="text-sm text-gray-400">{courses.length} cors{courses.length === 1 ? 'o' : 'i'} in scadenza</p>
                </div>
            </div>

            <div className="space-y-3">
                {courses.map((item) => (
                    <Link
                        key={item.courseId}
                        href={`/admin/courses/${item.courseId}`}
                        className="block"
                    >
                        <div className="glass border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.courseTitle}</p>
                                    <p className="text-sm text-gray-400">{item.count} utent{item.count === 1 ? 'e' : 'i'} in scadenza</p>
                                </div>
                                <DeadlineBadge
                                    dueDate={item.nextDeadline}
                                    completed={false}
                                />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    )
}
