"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"

type LeaderboardEntry = {
    rank: number
    userId: string
    userName: string
    totalPoints: number
    level: number
    coursesCompleted: number
    currentStreak: number
}

type LeaderboardProps = {
    leaderboard: LeaderboardEntry[]
    currentUserId?: string
}

export function LeaderboardComponent({ leaderboard, currentUserId }: LeaderboardProps) {
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-primary" />
            case 2:
                return <Medal className="w-6 h-6 text-muted-foreground" />
            case 3:
                return <Award className="w-6 h-6 text-secondary" />
            default:
                return <span className="text-muted-foreground font-bold">{rank}</span>
        }
    }

    return (
        <Card className="glass border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {leaderboard.map((entry) => {
                        const isCurrentUser = currentUserId === entry.userId

                        return (
                            <div
                                key={entry.userId}
                                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${isCurrentUser
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-8 flex justify-center">
                                        {getRankIcon(entry.rank)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-foreground">{entry.userName}</p>
                                            {isCurrentUser && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                                    Tu
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Level {entry.level} • {entry.coursesCompleted} corsi
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">{entry.totalPoints.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">punti</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
