
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsChartsProps {
    quizPerformance: { name: string, passRate: number, totalAttempts: number }[]
    progressDistribution: { name: string, count: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function AnalyticsCharts({ quizPerformance, progressDistribution }: AnalyticsChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quiz Performance Chart */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Performance Quiz (Tasso di Superamento)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={quizPerformance}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="name"
                                    className="text-xs text-muted-foreground"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <YAxis
                                    className="text-xs text-muted-foreground"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                />
                                <Bar dataKey="passRate" name="Pass Rate %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Progress Distribution Chart */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Distribuzione Progresso Utenti</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={progressDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {progressDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
