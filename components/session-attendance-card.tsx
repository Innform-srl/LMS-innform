"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AttendanceBadge } from "@/components/attendance-badge"
import { selfCheckIn, selfCheckOut, registerForSession } from "@/app/actions/attendance"
import { Clock, LogIn, LogOut, Calendar, MapPin, Users } from "lucide-react"
import { AttendanceStatus, SessionType } from "@prisma/client"
import { formatDateOnly, formatTime as formatTimeUtil } from "@/lib/utils"

interface SessionAttendanceCardProps {
    session: {
        id: string
        title: string
        description?: string | null
        startTime: Date
        endTime: Date
        meetingUrl: string
        sessionType: SessionType
        maxParticipants?: number | null
        physicalRoom?: {
            name: string
            location?: string | null
        } | null
        course?: {
            title: string
        } | null
    }
    attendance?: {
        id: string
        status: AttendanceStatus
        checkInTime?: Date | null
        checkOutTime?: Date | null
        durationMinutes?: number | null
    } | null
    registeredCount?: number
}

export function SessionAttendanceCard({
    session,
    attendance,
    registeredCount = 0
}: SessionAttendanceCardProps) {
    const [isPending, startTransition] = useTransition()
    const [localAttendance, setLocalAttendance] = useState(attendance)

    const now = new Date()
    const sessionStart = new Date(session.startTime)
    const sessionEnd = new Date(session.endTime)
    const checkInWindow = new Date(sessionStart.getTime() - 15 * 60 * 1000)

    const isBeforeCheckIn = now < checkInWindow
    const canCheckIn = now >= checkInWindow && now <= sessionEnd && !localAttendance?.checkInTime
    const canCheckOut = localAttendance?.checkInTime && !localAttendance?.checkOutTime && now <= new Date(sessionEnd.getTime() + 30 * 60 * 1000)
    const isSessionEnded = now > sessionEnd
    const isFull = session.maxParticipants ? registeredCount >= session.maxParticipants : false

    const handleRegister = () => {
        startTransition(async () => {
            const result = await registerForSession(session.id)
            if (result.success) {
                setLocalAttendance({ id: '', status: 'REGISTERED', checkInTime: null, checkOutTime: null, durationMinutes: null })
            }
        })
    }

    const handleCheckIn = () => {
        startTransition(async () => {
            const result = await selfCheckIn(session.id)
            if (result.success && result.attendance) {
                setLocalAttendance(result.attendance as SessionAttendanceCardProps["attendance"])
            }
        })
    }

    const handleCheckOut = () => {
        startTransition(async () => {
            const result = await selfCheckOut(session.id)
            if (result.success && result.attendance) {
                setLocalAttendance(result.attendance as SessionAttendanceCardProps["attendance"])
            }
        })
    }

    const sessionTypeLabels: Record<SessionType, string> = {
        ONLINE: "Online",
        IN_PERSON: "In Presenza",
        HYBRID: "Ibrida"
    }

    return (
        <Card className="glass border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                            {sessionTypeLabels[session.sessionType]}
                        </span>
                        {session.course && (
                            <span className="text-xs text-gray-400">
                                {session.course.title}
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{session.title}</h3>
                    {session.description && (
                        <p className="text-sm text-gray-400 mb-4">{session.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDateOnly(sessionStart)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatTimeUtil(sessionStart)} - {formatTimeUtil(sessionEnd)}
                        </div>
                        {session.physicalRoom && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {session.physicalRoom.name}
                                {session.physicalRoom.location && ` - ${session.physicalRoom.location}`}
                            </div>
                        )}
                        {session.maxParticipants && (
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {registeredCount}/{session.maxParticipants} partecipanti
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    {localAttendance && (
                        <AttendanceBadge status={localAttendance.status} size="md" />
                    )}
                </div>
            </div>

            {/* Attendance Info */}
            {localAttendance?.checkInTime && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                            <span className="text-gray-400">Check-in:</span>{' '}
                            <span className="font-medium">
                                {formatTimeUtil(new Date(localAttendance.checkInTime))}
                            </span>
                        </div>
                        {localAttendance.checkOutTime && (
                            <div>
                                <span className="text-gray-400">Check-out:</span>{' '}
                                <span className="font-medium">
                                    {formatTimeUtil(new Date(localAttendance.checkOutTime))}
                                </span>
                            </div>
                        )}
                        {localAttendance.durationMinutes !== null && localAttendance.durationMinutes !== undefined && (
                            <div>
                                <span className="text-gray-400">Durata:</span>{' '}
                                <span className="font-medium">{localAttendance.durationMinutes} minuti</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
                {!localAttendance && !isSessionEnded && (
                    <Button
                        onClick={handleRegister}
                        disabled={isPending || isFull}
                        variant="outline"
                        className="flex-1"
                    >
                        {isFull ? "Sessione al completo" : "Registrati"}
                    </Button>
                )}

                {canCheckIn && (
                    <Button
                        onClick={handleCheckIn}
                        disabled={isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        Check-in
                    </Button>
                )}

                {canCheckOut && (
                    <Button
                        onClick={handleCheckOut}
                        disabled={isPending}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Check-out
                    </Button>
                )}

                {localAttendance?.status === 'PRESENT' || localAttendance?.status === 'LATE' ? (
                    <Button
                        onClick={() => window.open(session.meetingUrl, '_blank')}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                        Accedi alla Sessione
                    </Button>
                ) : null}

                {isBeforeCheckIn && localAttendance && (
                    <p className="w-full text-sm text-gray-400 text-center">
                        Check-in disponibile dalle {formatTimeUtil(checkInWindow)}
                    </p>
                )}
            </div>
        </Card>
    )
}
