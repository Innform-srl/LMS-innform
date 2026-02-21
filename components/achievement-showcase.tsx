"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Lock, Book, FileText, Flame, Clock, Sparkles } from "lucide-react"

type Achievement = {
    id: string
    name: string
    description: string
    icon: string
    points: number
    category: string
    unlocked: boolean
    unlockedAt: Date | null
    progress: number
    current: number
    required: number
}

type AchievementShowcaseProps = {
    achievements: Achievement[]
}

export function AchievementShowcaseComponent({ achievements }: AchievementShowcaseProps) {
    // Group achievements by category
    const categories = {
        COURSE: achievements.filter(a => a.category === 'COURSE'),
        QUIZ: achievements.filter(a => a.category === 'QUIZ'),
        STREAK: achievements.filter(a => a.category === 'STREAK'),
        TIME: achievements.filter(a => a.category === 'TIME'),
        SPECIAL: achievements.filter(a => a.category === 'SPECIAL')
    }

    const categoryNames = {
        COURSE: { label: 'Corsi', icon: <Book className="w-5 h-5 text-blue-500" /> },
        QUIZ: { label: 'Quiz', icon: <FileText className="w-5 h-5 text-purple-500" /> },
        STREAK: { label: 'Streak', icon: <Flame className="w-5 h-5 text-orange-500" /> },
        TIME: { label: 'Tempo', icon: <Clock className="w-5 h-5 text-green-500" /> },
        SPECIAL: { label: 'Speciali', icon: <Sparkles className="w-5 h-5 text-yellow-500" /> }
    }

    return (
        <div className="space-y-6">
            {Object.entries(categories).map(([category, items]) => {
                if (items.length === 0) return null

                const categoryInfo = categoryNames[category as keyof typeof categoryNames]

                return (
                    <div key={category}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            {categoryInfo.icon}
                            {categoryInfo.label}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((achievement) => (
                                <Card
                                    key={achievement.id}
                                    className={`glass border-border transition-all ${achievement.unlocked
                                        ? 'bg-card border-primary/30'
                                        : 'opacity-60'
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`text-4xl ${achievement.unlocked ? '' : 'grayscale opacity-40'}`}>
                                                {achievement.unlocked ? achievement.icon : <Lock className="w-10 h-10" />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-foreground mb-1">{achievement.name}</h4>
                                                <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>

                                                {achievement.unlocked ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                                                            Sbloccato
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {achievement.points} pts
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                            <span>Progresso</span>
                                                            <span>{achievement.current} / {achievement.required}</span>
                                                        </div>
                                                        <Progress value={achievement.progress} className="h-2" />
                                                        <p className="text-xs text-muted-foreground mt-1">+{achievement.points} pts quando sbloccato</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
