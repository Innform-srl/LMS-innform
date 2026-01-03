"use client"

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { updateCourseSettings } from '@/app/actions/courses'
import { useRouter } from 'next/navigation'

interface CourseSettingsProps {
    courseId: string
    initialIsRequired: boolean
    initialDueInDays: number | null
    initialMinimumDuration: number
}

export function DeadlineSettings({ courseId, initialIsRequired, initialDueInDays, initialMinimumDuration }: CourseSettingsProps) {
    const [isRequired, setIsRequired] = useState(initialIsRequired)
    const [dueInDays, setDueInDays] = useState<number>(initialDueInDays || 30)
    const [minimumHours, setMinimumHours] = useState<number>(Math.round((initialMinimumDuration || 0) / 60))
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)

        startTransition(async () => {
            const result = await updateCourseSettings(courseId, {
                isRequired,
                dueInDays,
                minimumDuration: minimumHours * 60 // Convert hours to minutes
            })

            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            })

            if (result.success) {
                router.refresh()
            }
        })
    }

    return (
        <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Impostazioni Corso</h3>
                    <p className="text-sm text-muted-foreground">Configura durata minima e scadenze</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Minimum Duration */}
                <div className="space-y-2">
                    <Label htmlFor="minimumHours">Durata Minima (ore)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="minimumHours"
                            type="number"
                            min="0"
                            value={minimumHours}
                            onChange={(e) => setMinimumHours(parseInt(e.target.value) || 0)}
                            className="bg-background border-input w-32"
                        />
                        <span className="text-sm text-muted-foreground">ore richieste per il completamento</span>
                    </div>
                </div>

                <div className="border-t border-border my-4" />

                {/* Deadline Settings */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isRequired"
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background"
                        />
                        <Label htmlFor="isRequired" className="text-sm font-medium cursor-pointer">
                            Corso Obbligatorio
                        </Label>
                    </div>

                    {isRequired && (
                        <div className="space-y-2 pl-6 border-l-2 border-primary/30">
                            <Label htmlFor="dueInDays" className="text-sm">
                                Scadenza (giorni dall'assegnazione)
                            </Label>
                            <Input
                                id="dueInDays"
                                type="number"
                                min="1"
                                max="365"
                                value={dueInDays}
                                onChange={(e) => setDueInDays(parseInt(e.target.value) || 30)}
                                className="bg-background border-input w-32"
                            />
                            <p className="text-xs text-muted-foreground">
                                Gli utenti dovranno completare il corso entro {dueInDays} giorni dall'iscrizione.
                            </p>
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/30 text-green-600'
                        : 'bg-red-500/20 border border-red-500/30 text-red-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isPending ? (
                        <>
                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Salvataggio...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Salva Impostazioni
                        </>
                    )}
                </Button>
            </form>
        </Card>
    )
}
