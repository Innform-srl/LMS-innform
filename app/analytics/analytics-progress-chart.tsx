"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from "lucide-react"

interface AnalyticsProgressChartProps {
    progressTrend: Array<{ month: string; completed: number; enrolled: number }>
}

export default function AnalyticsProgressChart({ progressTrend }: AnalyticsProgressChartProps) {
    return (
        <Card className="glass border-border mb-8">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <CardTitle>Il Tuo Progresso</CardTitle>
                </div>
                <p className="text-sm text-gray-400">Ultimi 6 mesi</p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="enrolled"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Iscrizioni"
                            dot={{ fill: '#3b82f6', r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="completed"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Completati"
                            dot={{ fill: '#10b981', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
