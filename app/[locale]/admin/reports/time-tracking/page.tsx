"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getTimeTrackingReport, exportTimeTrackingCSV } from "@/app/actions/reports"
import Link from "next/link"

type ReportRow = {
    userId: string
    userName: string
    userEmail: string | null
    userDepartment: string | null
    courseId: string
    courseTitle: string
    timeSpent: number
    minimumDuration: number
    progress: number
    completed: boolean
    completedAt: Date | null
    enrolledAt: Date
    status: string
}

export default function TimeTrackingReportPage() {
    const [data, setData] = useState<ReportRow[]>([])
    const [filteredData, setFilteredData] = useState<ReportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [departmentFilter, setDepartmentFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        filterData()
    }, [data, searchTerm, departmentFilter, statusFilter])

    const loadData = async () => {
        setLoading(true)
        const result = await getTimeTrackingReport()
        if (result.success && result.data) {
            // Map the data to flatten userDepartment object to string
            const mappedData = result.data.map((row: any) => ({
                ...row,
                userDepartment: row.userDepartment?.name || null
            }))
            setData(mappedData)
        }
        setLoading(false)
    }

    const filterData = () => {
        let filtered = data

        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (departmentFilter) {
            filtered = filtered.filter(row => row.userDepartment === departmentFilter)
        }

        if (statusFilter) {
            filtered = filtered.filter(row => row.status === statusFilter)
        }

        setFilteredData(filtered)
    }

    const handleExportCSV = async () => {
        const result = await exportTimeTrackingCSV()
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: "text/csv" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `time-tracking-report-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        }
    }

    const departments = Array.from(new Set(data.map(row => row.userDepartment).filter(Boolean)))
    const statuses = Array.from(new Set(data.map(row => row.status)))

    const getStatusColor = (status: string) => {
        if (status === "Completato") return "text-green-600"
        if (status === "Tempo OK - In Corso") return "text-blue-600"
        if (status === "Tempo Insufficiente") return "text-orange-600"
        return "text-muted-foreground"
    }

    const getProgressColor = (timeSpent: number, minimumDuration: number) => {
        if (minimumDuration === 0) return "bg-blue-500"
        const percentage = (timeSpent / minimumDuration) * 100
        if (percentage >= 100) return "bg-green-500"
        if (percentage >= 80) return "bg-yellow-500"
        if (percentage >= 50) return "bg-orange-500"
        return "bg-red-500"
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Dashboard Admin
                    </Link>
                    <h1 className="text-4xl font-bold text-foreground mb-2">Report Time Tracking</h1>
                    <p className="text-muted-foreground">Monit ora il tempo trascorso dagli utenti sui corsi</p>
                </div>

                {/* Filters */}
                <Card className="bg-card border-border mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Filtri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                                placeholder="Cerca utente o corso..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-background border-border"
                            />
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
                            >
                                <option value="">Tutti i dipartimenti</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept!}>{dept}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
                            >
                                <option value="">Tutti gli stati</option>
                                {statuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <Button
                                onClick={handleExportCSV}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export a CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardDescription>Totale Iscrizioni</CardDescription>
                            <CardTitle className="text-3xl">{filteredData.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardDescription>Tempo Totale (ore)</CardDescription>
                            <CardTitle className="text-3xl">
                                {Math.floor(filteredData.reduce((acc, row) => acc + row.timeSpent, 0) / 60)}h
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardDescription>Completamenti</CardDescription>
                            <CardTitle className="text-3xl text-green-500">
                                {filteredData.filter(row => row.completed).length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Data Table */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Dettagli Time Tracking</CardTitle>
                        <CardDescription>{filteredData.length} risultati</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">Nessun risultato trovato</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                            <th className="pb-3 pr-4">Utente</th>
                                            <th className="pb-3 pr-4">Corso</th>
                                            <th className="pb-3 pr-4">Tempo Trascorso</th>
                                            <th className="pb-3 pr-4">Tempo Richiesto</th>
                                            <th className="pb-3 pr-4">Progresso</th>
                                            <th className="pb-3">Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row, index) => (
                                            <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                <td className="py-4 pr-4">
                                                    <div className="font-medium text-foreground">{row.userName}</div>
                                                    <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                                                    {row.userDepartment && (
                                                        <div className="text-xs text-muted-foreground">{row.userDepartment}</div>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4 text-muted-foreground">{row.courseTitle}</td>
                                                <td className="py-4 pr-4">
                                                    <div className="text-foreground font-semibold">
                                                        {Math.floor(row.timeSpent / 60)}h {row.timeSpent % 60}m
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{row.timeSpent} min</div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <div className="text-muted-foreground">
                                                        {Math.floor(row.minimumDuration / 60)}h
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{row.minimumDuration} min</div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                                                            <div
                                                                className={`h-full rounded-full ${getProgressColor(row.timeSpent, row.minimumDuration)}`}
                                                                style={{
                                                                    width: row.minimumDuration > 0
                                                                        ? `${Math.min((row.timeSpent / row.minimumDuration) * 100, 100)}%`
                                                                        : `${row.progress}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">{Math.round(row.progress)}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`text-sm font-semibold ${getStatusColor(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
