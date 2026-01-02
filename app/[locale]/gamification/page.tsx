"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AchievementShowcaseComponent } from "@/components/achievement-showcase"
import { LeaderboardComponent } from "@/components/leaderboard"
import { Loader2, Trophy, Star, Flame, TrendingUp, Gamepad2, BarChart } from "lucide-react"
import Link from "next/link"
import { calculateLevel, pointsForNextLevel } from "@/lib/gamification"

type UserStats = {
    totalPoints: number
    level: number
    currentStreak: number
    longestStreak: number
    coursesCompleted: number
    quizzesCompleted: number

    totalStudyTime: number
    userId: string
}

export default function GamificationPage() {
    const [stats, setStats] = useState<UserStats | null>(null)
    const [achievements, setAchievements] = useState<any>(null)
    const [leaderboard, setLeaderboard] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetch('/api/user/stats').then(r => r.json()),
            fetch('/api/user/achievements').then(r => r.json()),
            fetch('/api/leaderboard?limit=10').then(r => r.json())
        ]).then(([statsData, achievementsData, leaderboardData]) => {
            setStats(statsData)
            setAchievements(achievementsData)
            setLeaderboard(leaderboardData)
        }).finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground transition-colors duration-300">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <div className="text-center text-destructive">Errore caricamento</div>
            </div>
        )
    }

    const pointsToNext = pointsForNextLevel(stats.level)
    const currentLevelPoints = pointsForNextLevel(stats.level - 1)
    const progressToNext = ((stats.totalPoints - currentLevelPoints) / (pointsToNext - currentLevelPoints)) * 100

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Home
                    </Link>
                    <h1 className="text-4xl font-bold mt-2 flex items-center gap-3">
                        <Gamepad2 className="w-10 h-10 text-primary" />
                        <span className="text-primary">Gamification</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">Il tuo percorso di crescita e achievements</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Level & Punti</CardTitle>
                                <Star className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                Level {stats.level}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{stats.totalPoints.toLocaleString()} punti totali</p>
                            <Progress value={progressToNext} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                                {pointsToNext - stats.totalPoints} pts al prossimo livello
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Streak Corrente</CardTitle>
                                <Flame className="w-4 h-4 text-destructive" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                                {stats.currentStreak} <Flame className="w-6 h-6 text-destructive fill-destructive" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Record: {stats.longestStreak} giorni
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Achievements</CardTitle>
                                <Trophy className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {achievements?.totalUnlocked || 0}/{achievements?.totalAvailable || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {Math.round(((achievements?.totalUnlocked || 0) / (achievements?.totalAvailable || 1)) * 100)}% completato
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Attività</CardTitle>
                                <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground mb-2">
                                {stats.coursesCompleted}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Corsi • {stats.quizzesCompleted} quiz • {Math.floor(stats.totalStudyTime / 60)}h studio
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Two Columns: Achievements and Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Achievements - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-primary" />
                            I Tuoi Achievements
                        </h2>
                        {achievements && (
                            <AchievementShowcaseComponent achievements={achievements.achievements} />
                        )}
                    </div>

                    {/* Leaderboard - Takes 1 column */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <BarChart className="w-6 h-6 text-primary" />
                            Top 10
                        </h2>
                        {leaderboard && (
                            <LeaderboardComponent
                                leaderboard={leaderboard.leaderboard}
                                currentUserId={stats.userId}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
