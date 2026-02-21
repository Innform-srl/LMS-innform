"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BookOpen, GraduationCap, Activity } from "lucide-react"
import { apiUrl } from "@/lib/api"

function ChartLoading() {
    return (
        <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    )
}

// Lazy load the entire charts component to reduce initial bundle
const AnalyticsCharts = dynamic(() => import("./analytics-charts"), {
    loading: () => <ChartLoading />,
    ssr: false
})

export function AnalyticsDashboard() {
    const [overview, setOverview] = useState<Record<string, number> | null>(null)
    const [timeline, setTimeline] = useState<Record<string, unknown>[]>([])
    const [deptData, setDeptData] = useState<Record<string, unknown>[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overviewRes, timelineRes, deptRes] = await Promise.all([
                    fetch(apiUrl('/api/analytics/overview')),
                    fetch(apiUrl('/api/analytics/progress-timeline')),
                    fetch(apiUrl('/api/analytics/department-comparison'))
                ])

                if (overviewRes.ok) setOverview(await overviewRes.json())
                if (timelineRes.ok) setTimeline(await timelineRes.json())
                if (deptRes.ok) setDeptData(await deptRes.json())
            } catch (error) {
                console.error("Failed to fetch analytics", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview?.totalUsers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {overview?.activeUsers || 0} attivi negli ultimi 7 giorni
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Corsi Pubblicati</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview?.totalCourses || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Iscrizioni Totali</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview?.totalEnrollments || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completamento Medio</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview?.avgCompletion || 0}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts - Lazy loaded */}
            <AnalyticsCharts timeline={timeline} deptData={deptData} />
        </div>
    )
}
