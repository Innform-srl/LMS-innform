"use client"

import { useState, useTransition, Fragment, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AttendanceBadge } from "@/components/attendance-badge"
import { GoogleMeetSync } from "@/components/google-meet-sync"
import {
    adminCheckIn,
    adminCheckOut,
    updateAttendanceStatus,
    bulkUpdateAttendance,
    markAbsentUsers,
    exportAttendanceCSV
} from "@/app/actions/attendance"
import { AttendanceStatus } from "@prisma/client"
import { Search, Download, UserCheck, UserX, LogIn, LogOut, RefreshCw, Monitor, Phone, User, UserPlus, Clock, AlertTriangle, Check, GraduationCap } from "lucide-react"

interface AttendanceRecord {
    id: string
    status: AttendanceStatus
    checkInTime: Date | null
    checkOutTime: Date | null
    durationMinutes: number | null
    notes: string | null
    user: {
        id: string
        name: string | null
        email: string
        role: string
        department: { name: string } | null
    }
}

interface UnmatchedMeetParticipant {
    displayName: string
    email?: string
    checkInTime: string | null
    checkOutTime: string | null
    durationMinutes: number
    sessionCount: number
    sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>
    participantType: "google" | "anonymous" | "phone"
}

interface AttendanceTableProps {
    sessionId: string
    attendance: AttendanceRecord[]
    isEnded: boolean
    googleMeetCode?: string | null
    unmatchedMeetParticipants?: UnmatchedMeetParticipant[] | null
    instructorId?: string
}

interface MeetMetadata {
    source: "google-meet"
    durationMinutes: number
    sessionCount: number
    sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>
    participantType: "google" | "anonymous" | "phone"
    displayName: string
}

function parseMeetNotes(notes: string | null): MeetMetadata | null {
    if (!notes) return null
    try {
        const data = JSON.parse(notes)
        if (data.source === "google-meet") return data as MeetMetadata
    } catch {
        // Notes non è JSON (vecchio formato testo)
    }
    return null
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDurationHours(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(1, '0')}:${m.toString().padStart(2, '0')} ore`
}

const participantTypeConfig = {
    google: { icon: Monitor, label: "Google", className: "text-blue-500 bg-blue-500/10" },
    anonymous: { icon: User, label: "Anonimo", className: "text-amber-500 bg-amber-500/10" },
    phone: { icon: Phone, label: "Telefono", className: "text-green-500 bg-green-500/10" },
}

const statusOptions: { value: AttendanceStatus; label: string; icon: string; dotColor: string }[] = [
    { value: "REGISTERED", label: "Registrato", icon: "📝", dotColor: "bg-blue-500" },
    { value: "PRESENT", label: "Presente", icon: "✅", dotColor: "bg-green-500" },
    { value: "ATTENDED", label: "Completato", icon: "🎯", dotColor: "bg-emerald-500" },
    { value: "ABSENT", label: "Assente", icon: "❌", dotColor: "bg-red-500" },
    { value: "LATE", label: "In ritardo", icon: "⏰", dotColor: "bg-orange-500" },
    { value: "EXCUSED", label: "Giustificato", icon: "📋", dotColor: "bg-gray-500" },
]

export function AttendanceTable({ sessionId, attendance, isEnded, googleMeetCode, unmatchedMeetParticipants, instructorId }: AttendanceTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [mounted, setMounted] = useState(false)
    const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
    const [associations, setAssociations] = useState<Record<number, string>>({})
    const [associating, setAssociating] = useState<number | null>(null)
    const [associatedIndexes, setAssociatedIndexes] = useState<Set<number>>(new Set())

    useEffect(() => { setMounted(true) }, [])

    const loadUsers = async () => {
        try {
            const res = await fetch("/lms/api/integrations/google-meet?action=users")
            if (res.ok) {
                const data = await res.json()
                setAllUsers(data.users || [])
            }
        } catch (err) {
            console.error("Failed to load users:", err)
        }
    }

    useEffect(() => {
        if (unmatchedMeetParticipants && unmatchedMeetParticipants.length > 0) {
            loadUsers()
        }
    }, [unmatchedMeetParticipants])

    const handleAssociateUnmatched = async (index: number, participant: UnmatchedMeetParticipant) => {
        const userId = associations[index]
        if (!userId) return

        setAssociating(index)
        try {
            const res = await fetch("/lms/api/integrations/google-meet", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    userId,
                    displayName: participant.displayName,
                    checkInTime: participant.checkInTime,
                    checkOutTime: participant.checkOutTime,
                    durationMinutes: participant.durationMinutes,
                    sessionCount: participant.sessionCount,
                    sessions: participant.sessions,
                    participantType: participant.participantType
                })
            })
            const data = await res.json()
            if (data.success) {
                setAssociatedIndexes(prev => new Set([...prev, index]))
                router.refresh()
            }
        } catch (err) {
            console.error("Association failed:", err)
        } finally {
            setAssociating(null)
        }
    }

    const formatTime = (date: Date | string | null) => {
        if (!date || !mounted) return "—"
        const d = new Date(date)
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    }

    const filteredAttendance = attendance.filter((a) => {
        const matchesSearch =
            a.user.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.user.email.toLowerCase().includes(search.toLowerCase()) ||
            a.user.department?.name.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === "all" || a.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAttendance.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredAttendance.map(a => a.user.id)))
        }
    }

    const handleStatusChange = (attendanceId: string, newStatus: AttendanceStatus) => {
        startTransition(async () => {
            await updateAttendanceStatus(attendanceId, newStatus)
            router.refresh()
        })
    }

    const handleBulkStatusChange = (newStatus: AttendanceStatus) => {
        if (selectedIds.size === 0) return
        startTransition(async () => {
            await bulkUpdateAttendance(sessionId, Array.from(selectedIds), newStatus)
            setSelectedIds(new Set())
            router.refresh()
        })
    }

    const handleCheckIn = (userId: string) => {
        startTransition(async () => {
            await adminCheckIn(sessionId, userId)
            router.refresh()
        })
    }

    const handleCheckOut = (userId: string) => {
        startTransition(async () => {
            await adminCheckOut(sessionId, userId)
            router.refresh()
        })
    }

    const handleMarkAbsent = () => {
        startTransition(async () => {
            await markAbsentUsers(sessionId)
            router.refresh()
        })
    }

    const handleExport = async () => {
        const result = await exportAttendanceCSV(sessionId)
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = result.filename || 'presenze.csv'
            link.click()
            URL.revokeObjectURL(url)
        }
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-foreground">Registro Presenze</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <GoogleMeetSync
                            sessionId={sessionId}
                            googleMeetCode={googleMeetCode}
                            onSync={() => router.refresh()}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Esporta CSV
                        </Button>
                        {isEnded && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAbsent}
                                disabled={isPending}
                            >
                                <UserX className="w-4 h-4 mr-2" />
                                Segna assenti
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cerca per nome, email o dipartimento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtra per stato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutti gli stati</SelectItem>
                            {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4 p-4 mb-4 bg-primary/10 rounded-lg">
                        <span className="text-sm font-medium">
                            {selectedIds.size} selezionati
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkStatusChange("PRESENT")}
                                disabled={isPending}
                            >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Presenti
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkStatusChange("ATTENDED")}
                                disabled={isPending}
                            >
                                Completato
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkStatusChange("ABSENT")}
                                disabled={isPending}
                            >
                                <UserX className="w-4 h-4 mr-1" />
                                Assenti
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkStatusChange("EXCUSED")}
                                disabled={isPending}
                            >
                                Giustificati
                            </Button>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Annulla
                        </Button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-2 w-10">
                                    <Checkbox
                                        checked={selectedIds.size === filteredAttendance.length && filteredAttendance.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Utente</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Dipartimento</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Stato</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Check-in</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Check-out</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Durata</th>
                                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttendance.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Nessun partecipante trovato
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendance.map((record) => (
                                    <tr key={record.id} className="border-b border-border hover:bg-muted/30">
                                        <td className="py-3 px-2">
                                            <Checkbox
                                                checked={selectedIds.has(record.user.id)}
                                                onCheckedChange={() => toggleSelection(record.user.id)}
                                            />
                                        </td>
                                        <td className="py-3 px-2">
                                            {(() => {
                                                const meetData = parseMeetNotes(record.notes)
                                                const typeConfig = meetData ? participantTypeConfig[meetData.participantType] : null
                                                const TypeIcon = typeConfig?.icon
                                                const isInstructor = record.user.id === instructorId
                                                return (
                                                    <div>
                                                        <p className="font-medium text-foreground flex items-center gap-2">
                                                            {record.user.name || "—"}
                                                            {isInstructor && (
                                                                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-purple-500 bg-purple-500/10">
                                                                    <GraduationCap className="w-3 h-3" />
                                                                    Docente
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {record.user.email}
                                                        </p>
                                                        {TypeIcon && (
                                                            <span className={`inline-flex items-center gap-1 mt-1 text-xs px-1.5 py-0.5 rounded-full ${typeConfig.className}`}>
                                                                <TypeIcon className="w-3 h-3" />
                                                                {typeConfig.label}
                                                                {meetData && meetData.displayName && meetData.participantType !== "google" && (
                                                                    <span className="text-muted-foreground ml-1">
                                                                        &quot;{meetData.displayName}&quot;
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {record.user.department?.name || "—"}
                                        </td>
                                        <td className="py-3 px-2">
                                            <Select
                                                value={record.status}
                                                onValueChange={(value) => handleStatusChange(record.id, value as AttendanceStatus)}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger className="w-auto h-auto border-none bg-transparent shadow-none p-0 gap-1.5 focus:ring-0 focus:ring-offset-0 [&>svg]:opacity-30 [&>svg]:hover:opacity-60 [&>svg]:transition-opacity">
                                                    <AttendanceBadge status={record.status} size="sm" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            <span className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                                                                <span>{opt.icon} {opt.label}</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {formatTime(record.checkInTime)}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {formatTime(record.checkOutTime)}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {(() => {
                                                const meetData = parseMeetNotes(record.notes)
                                                if (record.durationMinutes === null) return "—"
                                                if (!meetData) return formatDurationHours(record.durationMinutes)

                                                const sortedSessions = [...meetData.sessions].sort(
                                                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                                )
                                                const lastSess = sortedSessions[sortedSessions.length - 1]
                                                const isOnline = lastSess && !lastSess.endTime
                                                let totalDisconnectMin = 0

                                                return (
                                                    <div>
                                                        <p className="font-medium text-foreground flex items-center gap-1.5">
                                                            {formatDurationHours(record.durationMinutes!)}
                                                            {meetData.sessionCount > 1 && (
                                                                <span className="font-normal text-xs text-amber-500">
                                                                    ({meetData.sessionCount} connessioni)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <div className="mt-1.5 space-y-0">
                                                            {sortedSessions.map((s, i) => {
                                                                const start = formatTime(s.startTime)
                                                                const end = s.endTime
                                                                    ? formatTime(s.endTime)
                                                                    : null
                                                                let gapMin = 0
                                                                if (i > 0 && sortedSessions[i - 1].endTime) {
                                                                    gapMin = Math.round(
                                                                        (new Date(s.startTime).getTime() - new Date(sortedSessions[i - 1].endTime!).getTime()) / (1000 * 60)
                                                                    )
                                                                    totalDisconnectMin += gapMin
                                                                }
                                                                return (
                                                                    <Fragment key={i}>
                                                                        {gapMin > 0 && (
                                                                            <p className="text-xs text-red-400/70 pl-2 py-0.5 border-l-2 border-red-400/30">
                                                                                disconnesso {gapMin} min
                                                                            </p>
                                                                        )}
                                                                        <p className={`text-xs pl-2 py-0.5 border-l-2 ${end ? 'text-muted-foreground/70 border-muted-foreground/20' : 'text-green-500 border-green-400/30'}`}>
                                                                            {start} – {end ?? "in corso"}
                                                                            {end && <span className="text-muted-foreground/50"> ({formatDuration(s.durationMinutes)})</span>}
                                                                        </p>
                                                                    </Fragment>
                                                                )
                                                            })}
                                                            {!isOnline && lastSess?.endTime && (
                                                                <p className="text-xs text-red-400/70 pl-2 py-0.5 border-l-2 border-red-400/30">
                                                                    uscita alle {formatTime(lastSess.endTime)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {totalDisconnectMin > 0 && (
                                                            <p className="mt-1 text-xs text-red-400/60">
                                                                Tot. disconnesso: {totalDisconnectMin} min
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                {!record.checkInTime && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCheckIn(record.user.id)}
                                                        disabled={isPending}
                                                        title="Check-in manuale"
                                                    >
                                                        <LogIn className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {record.checkInTime && !record.checkOutTime && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCheckOut(record.user.id)}
                                                        disabled={isPending}
                                                        title="Check-out manuale"
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Partecipanti Google Meet non associati */}
                {unmatchedMeetParticipants && unmatchedMeetParticipants.length > 0 && (
                    <div className="mt-6 border border-orange-500/20 rounded-lg overflow-hidden">
                        <div className="bg-orange-500/10 px-4 py-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-orange-400">
                                {unmatchedMeetParticipants.filter((_, i) => !associatedIndexes.has(i)).length} partecipant{unmatchedMeetParticipants.filter((_, i) => !associatedIndexes.has(i)).length === 1 ? "e" : "i"} Google Meet non associat{unmatchedMeetParticipants.filter((_, i) => !associatedIndexes.has(i)).length === 1 ? "o" : "i"}
                            </span>
                        </div>
                        <div className="divide-y divide-border">
                            {unmatchedMeetParticipants.map((p, idx) => {
                                const typeConfig = participantTypeConfig[p.participantType]
                                const TypeIcon = typeConfig?.icon
                                return (
                                    <div key={idx} className={`px-4 py-3 ${associatedIndexes.has(idx) ? "opacity-50" : ""}`}>
                                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground">
                                                        {p.displayName}
                                                    </p>
                                                    {TypeIcon && (
                                                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${typeConfig.className}`}>
                                                            <TypeIcon className="w-3 h-3" />
                                                            {typeConfig.label}
                                                        </span>
                                                    )}
                                                </div>
                                                {p.email && (
                                                    <p className="text-xs text-muted-foreground">{p.email}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    {p.checkInTime && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(p.checkInTime)}
                                                            {p.checkOutTime && ` – ${formatTime(p.checkOutTime)}`}
                                                        </span>
                                                    )}
                                                    <span>{formatDuration(p.durationMinutes)}</span>
                                                    {p.sessionCount > 1 && (
                                                        <span>({p.sessionCount} connessioni)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {associatedIndexes.has(idx) ? (
                                                    <div className="flex items-center gap-1.5 text-green-500 text-sm">
                                                        <Check className="w-4 h-4" />
                                                        Associato
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Select
                                                            value={associations[idx] || ""}
                                                            onValueChange={(val) => setAssociations(prev => ({ ...prev, [idx]: val }))}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs w-[220px]">
                                                                <SelectValue placeholder="Associa a un utente..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allUsers.map(u => (
                                                                    <SelectItem key={u.id} value={u.id} className="text-xs">
                                                                        {u.name || u.email} {u.name ? `(${u.email})` : ""}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-2"
                                                            disabled={!associations[idx] || associating === idx}
                                                            onClick={() => handleAssociateUnmatched(idx, p)}
                                                        >
                                                            {associating === idx ? (
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <UserPlus className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {isPending && (
                    <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
