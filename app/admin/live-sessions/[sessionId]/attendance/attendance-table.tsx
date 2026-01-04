"use client"

import { useState, useTransition } from "react"
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
import { Search, Download, UserCheck, UserX, LogIn, LogOut, RefreshCw } from "lucide-react"

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
        department: { name: string } | null
    }
}

interface AttendanceTableProps {
    sessionId: string
    attendance: AttendanceRecord[]
    isEnded: boolean
}

const statusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: "REGISTERED", label: "Registrato" },
    { value: "PRESENT", label: "Presente" },
    { value: "ATTENDED", label: "Completato" },
    { value: "ABSENT", label: "Assente" },
    { value: "LATE", label: "In ritardo" },
    { value: "EXCUSED", label: "Giustificato" },
]

export function AttendanceTable({ sessionId, attendance, isEnded }: AttendanceTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {record.user.name || "—"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {record.user.email}
                                                </p>
                                            </div>
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
                                                <SelectTrigger className="w-[140px] h-8">
                                                    <AttendanceBadge status={record.status} size="sm" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {record.checkInTime
                                                ? new Date(record.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                                                : "—"}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {record.checkOutTime
                                                ? new Date(record.checkOutTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                                                : "—"}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-muted-foreground">
                                            {record.durationMinutes !== null ? `${record.durationMinutes} min` : "—"}
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

                {isPending && (
                    <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
