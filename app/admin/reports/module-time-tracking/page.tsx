"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getModuleTimeTrackingReport, exportModuleTimeTrackingCSV } from "@/app/actions/reports"
import Link from "next/link"
import { Clock, FileDown, BookOpen, Users, CheckCircle2, Timer } from "lucide-react"

type ModuleReportRow = {
    moduleProgressId: string
    userId: string
    userName: string
    userEmail: string | null
    userDepartment: string | null
    courseId: string
    courseTitle: string
    moduleId: string
    moduleTitle: string
    modulePosition: number
    contentType: string
    timeSpent: number
    watchedSeconds: number
    minimumDuration: number
    completed: boolean
    completedAt: Date | null
    lastActivity: Date
    status: string
}

export default function ModuleTimeTrackingReportPage() {
    const [data, setData] = useState<ModuleReportRow[]>([])
    const [filteredData, setFilteredData] = useState<ModuleReportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [courseFilter, setCourseFilter] = useState("")
    const [departmentFilter, setDepartmentFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

    const loadData = async () => {
        setLoading(true)
        const result = await getModuleTimeTrackingReport()
        if (result.success && result.data) {
            setData(result.data)
        }
        setLoading(false)
    }

    const filterData = () => {
        let filtered = data

        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.moduleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (courseFilter) {
            filtered = filtered.filter(row => row.courseId === courseFilter)
        }

        if (departmentFilter) {
            filtered = filtered.filter(row => row.userDepartment === departmentFilter)
        }

        if (statusFilter) {
            filtered = filtered.filter(row => row.status === statusFilter)
        }

        setFilteredData(filtered)
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        filterData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, searchTerm, courseFilter, departmentFilter, statusFilter])

    const handleExportCSV = async () => {
        const filters: { courseId?: string } = {}
        if (courseFilter) filters.courseId = courseFilter

        const result = await exportModuleTimeTrackingCSV(filters)
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: "text/csv" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `module-time-tracking-report-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        }
    }

    // Get unique values for filters
    const courses = Array.from(new Map(data.map(row => [row.courseId, { id: row.courseId, title: row.courseTitle }])).values())
    const departments = Array.from(new Set(data.map(row => row.userDepartment).filter(Boolean)))
    const statuses = Array.from(new Set(data.map(row => row.status)))

    // Group data by user and course for better visualization
    const groupedData = filteredData.reduce((acc, row) => {
        const key = `${row.userId}-${row.courseId}`
        if (!acc[key]) {
            acc[key] = {
                userId: row.userId,
                userName: row.userName,
                userEmail: row.userEmail,
                userDepartment: row.userDepartment,
                courseId: row.courseId,
                courseTitle: row.courseTitle,
                modules: []
            }
        }
        acc[key].modules.push(row)
        return acc
    }, {} as Record<string, { userId: string; userName: string; userEmail: string | null; userDepartment: string | null; courseId: string; courseTitle: string; modules: ModuleReportRow[] }>)

    const groupedArray = Object.values(groupedData).map(group => ({
        ...group,
        totalTimeSpent: group.modules.reduce((sum, m) => sum + m.timeSpent, 0),
        completedModules: group.modules.filter(m => m.completed).length,
        totalModules: group.modules.length
    }))

    const getStatusColor = (status: string) => {
        if (status === "Completato") return "text-green-600 bg-green-100 dark:bg-green-900/30"
        if (status === "Tempo OK - In Corso") return "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
        if (status === "Tempo Insufficiente") return "text-orange-600 bg-orange-100 dark:bg-orange-900/30"
        return "text-muted-foreground bg-muted"
    }

    const getProgressColor = (timeSpent: number, minimumDuration: number) => {
        if (minimumDuration === 0) return "bg-blue-500"
        const percentage = (timeSpent / (minimumDuration * 60)) * 100
        if (percentage >= 100) return "bg-green-500"
        if (percentage >= 80) return "bg-yellow-500"
        if (percentage >= 50) return "bg-orange-500"
        return "bg-red-500"
    }

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        if (hours > 0) return `${hours}h ${minutes}m`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    const toggleCourseExpand = (key: string) => {
        const newExpanded = new Set(expandedCourses)
        if (newExpanded.has(key)) {
            newExpanded.delete(key)
        } else {
            newExpanded.add(key)
        }
        setExpandedCourses(newExpanded)
    }

    // Calculate stats
    const totalTimeAll = filteredData.reduce((sum, row) => sum + row.timeSpent, 0)
    const completedModulesCount = filteredData.filter(row => row.completed).length
    const uniqueUsers = new Set(filteredData.map(row => row.userId)).size

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
                    <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                        <Timer className="w-10 h-10 text-primary" />
                        Report Tempo Moduli
                    </h1>
                    <p className="text-muted-foreground">Dettaglio del tempo trascorso su ogni singolo modulo per ogni utente</p>
                </div>

                {/* Filters */}
                <Card className="bg-card border-border mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Filtri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <Input
                                placeholder="Cerca utente, modulo o corso..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-background border-border"
                            />
                            <select
                                value={courseFilter}
                                onChange={(e) => setCourseFilter(e.target.value)}
                                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
                            >
                                <option value="">Tutti i corsi</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.title}</option>
                                ))}
                            </select>
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
                                <FileDown className="w-4 h-4 mr-2" />
                                Esporta CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Utenti Attivi</CardDescription>
                                <Users className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">{uniqueUsers}</CardTitle>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Moduli Tracciati</CardDescription>
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">{filteredData.length}</CardTitle>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Tempo Totale</CardDescription>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl">{formatTime(totalTimeAll)}</CardTitle>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Moduli Completati</CardDescription>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-3xl text-green-500">{completedModulesCount}</CardTitle>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table - Grouped View */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Dettaglio Tempo per Modulo</CardTitle>
                        <CardDescription>{groupedArray.length} utenti/corsi • {filteredData.length} record moduli</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
                        ) : groupedArray.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">Nessun risultato trovato</div>
                        ) : (
                            <div className="space-y-4">
                                {groupedArray.map((group) => {
                                    const key = `${group.userId}-${group.courseId}`
                                    const isExpanded = expandedCourses.has(key)

                                    return (
                                        <div key={key} className="border border-border rounded-lg overflow-hidden">
                                            {/* Group Header */}
                                            <div
                                                onClick={() => toggleCourseExpand(key)}
                                                className="p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <svg
                                                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <div>
                                                        <div className="font-semibold text-foreground">{group.userName}</div>
                                                        <div className="text-sm text-muted-foreground">{group.userEmail}</div>
                                                        {group.userDepartment && (
                                                            <div className="text-xs text-muted-foreground">{group.userDepartment}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-sm text-muted-foreground">Corso</div>
                                                        <div className="font-medium text-foreground">{group.courseTitle}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-muted-foreground">Tempo Totale</div>
                                                        <div className="font-bold text-primary">{formatTime(group.totalTimeSpent)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-muted-foreground">Completati</div>
                                                        <div className="font-bold text-green-500">
                                                            {group.completedModules}/{group.totalModules}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Module Details */}
                                            {isExpanded && (
                                                <div className="divide-y divide-border">
                                                    {group.modules.sort((a, b) => a.modulePosition - b.modulePosition).map((module) => (
                                                        <div key={module.moduleProgressId} className="p-4 pl-12 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                    module.completed
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-muted text-muted-foreground'
                                                                }`}>
                                                                    {module.modulePosition}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-foreground">{module.moduleTitle}</div>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded bg-muted">
                                                                            {module.contentType}
                                                                        </span>
                                                                        {module.minimumDuration > 0 && (
                                                                            <span>Min: {module.minimumDuration}m</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-32">
                                                                    <div className="flex justify-between text-xs mb-1">
                                                                        <span className="text-muted-foreground">Tempo</span>
                                                                        <span className="font-mono font-semibold">{formatTime(module.timeSpent)}</span>
                                                                    </div>
                                                                    {module.minimumDuration > 0 && (
                                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full ${getProgressColor(module.timeSpent, module.minimumDuration)}`}
                                                                                style={{ width: `${Math.min((module.timeSpent / (module.minimumDuration * 60)) * 100, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right min-w-[100px]">
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(module.status)}`}>
                                                                        {module.status}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground min-w-[80px] text-right">
                                                                    {new Date(module.lastActivity).toLocaleDateString("it-IT")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
