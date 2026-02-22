"use client"

import { Button } from "@/components/ui/button"
import { deleteModule, toggleModulePublished } from "@/app/actions/modules"
import { useState, useEffect } from "react"
import Link from "next/link"

function formatDate(date: Date | string) {
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
}

function ClientDate({ date }: { date: Date | string }) {
    const [formatted, setFormatted] = useState("")
    useEffect(() => { setFormatted(formatDate(date)) }, [date])
    return <>{formatted}</>
}

type Module = {
    id: string
    title: string
    description: string | null
    videoUrl: string | null
    position: number
    published: boolean
    quiz?: {
        id: string
        title: string
        _count: {
            questions: number
        }
    } | null
    liveSession?: {
        id: string
        title: string
        startTime: Date | null
        endTime: Date | null
        meetingUrl: string | null
    } | null
}

export function ModuleList({ modules, courseId }: { modules: Module[], courseId: string }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const handleDelete = async (moduleId: string) => {
        if (!confirm("Sei sicuro di voler eliminare questo modulo?")) return

        setIsDeleting(moduleId)
        await deleteModule(moduleId, courseId)
        setIsDeleting(null)
    }

    const handleTogglePublished = async (moduleId: string) => {
        await toggleModulePublished(moduleId, courseId)
    }

    if (modules.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nessun modulo presente. Aggiungi il primo modulo per iniziare.
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {modules.map((module, index) => (
                <div key={module.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary">
                        {index + 1}
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-foreground">{module.title}</div>
                        {module.description && (
                            <div className="text-sm text-muted-foreground">{module.description}</div>
                        )}
                        <div className="flex gap-3 mt-2">
                            {module.videoUrl && (
                                <div className="text-xs text-blue-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Video
                                </div>
                            )}
                            {module.liveSession && (
                                <div className="text-xs text-purple-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Live: {module.liveSession.startTime ? <ClientDate date={module.liveSession.startTime} /> : 'Da programmare'}
                                </div>
                            )}
                            {module.quiz ? (
                                <div className="text-xs text-green-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Quiz ({module.quiz._count.questions} domande)
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">Nessun quiz</div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/admin/courses/${courseId}/modules/${module.id}/edit`}>
                            <Button variant="outline" size="sm">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Modifica
                            </Button>
                        </Link>

                        {module.quiz ? (
                            <Link href={`/admin/quiz/${module.quiz.id}`}>
                                <Button variant="outline" size="sm" className="border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-600">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Modifica Quiz
                                </Button>
                            </Link>
                        ) : (
                            <Link href={`/admin/courses/${courseId}/modules/${module.id}/quiz/create`}>
                                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                                    + Quiz
                                </Button>
                            </Link>
                        )}

                        <Button
                            variant={module.published ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => handleTogglePublished(module.id)}
                            className="border-border"
                        >
                            {module.published ? "Nascondi" : "Pubblica"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(module.id)}
                            disabled={isDeleting === module.id}
                            className="hover:bg-destructive/10 hover:text-destructive"
                        >
                            {isDeleting === module.id ? "..." : "Elimina"}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}
