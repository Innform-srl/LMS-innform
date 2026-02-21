"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from "recharts"

interface AnalyticsChartsProps {
    timeline: Record<string, unknown>[]
    deptData: Record<string, unknown>[]
}

export default function AnalyticsCharts({ timeline, deptData }: AnalyticsChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Attività Ultimi 30 Giorni</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => {
                                        const d = new Date(str);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    stroke="#888"
                                />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="enrollments" name="Nuove Iscrizioni" stroke="#8884d8" strokeWidth={2} />
                                <Line type="monotone" dataKey="completions" name="Completamenti" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Performance per Dipartimento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="avgProgress" name="Progresso Medio %" fill="#8884d8" />
                                <Bar dataKey="completed" name="Corsi Completati" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
