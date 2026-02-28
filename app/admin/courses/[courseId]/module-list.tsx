"use client"

import { Button } from "@/components/ui/button"
import { deleteModule, toggleModulePublished, reorderModules } from "@/app/actions/modules"
import { useState, useEffect, useId } from "react"
import Link from "next/link"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
    contentType?: string | null
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

function ModuleItemContent({
    module,
    index,
    courseId,
    isDeleting,
    onDelete,
    onTogglePublished,
    dragHandleProps,
    isDragging,
}: {
    module: Module
    index: number
    courseId: string
    isDeleting: boolean
    onDelete: (id: string) => void
    onTogglePublished: (id: string) => void
    dragHandleProps?: Record<string, unknown>
    isDragging?: boolean
}) {
    return (
        <div className={`flex items-center gap-3 p-4 bg-card border border-border rounded-lg transition-colors ${
            isDragging ? "opacity-50 ring-2 ring-primary/30" : "hover:bg-accent"
        }`}>
            <div
                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 rounded hover:bg-accent"
                {...dragHandleProps}
            >
                <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                </svg>
            </div>

            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary text-sm">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{module.title}</div>
                {module.description && (
                    <div className="text-sm text-muted-foreground truncate">{module.description}</div>
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
                        <div className="text-xs text-primary flex items-center gap-1">
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
            <div className="flex gap-2 flex-shrink-0">
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
                    onClick={(e) => {
                        e.stopPropagation()
                        onTogglePublished(module.id)
                    }}
                    className="border-border"
                >
                    {module.published ? "Nascondi" : "Pubblica"}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(module.id)
                    }}
                    disabled={isDeleting}
                    className="hover:bg-destructive/10 hover:text-destructive"
                >
                    {isDeleting ? "..." : "Elimina"}
                </Button>
            </div>
        </div>
    )
}

function SortableModuleItem({
    module,
    index,
    courseId,
    isDeleting,
    onDelete,
    onTogglePublished,
}: {
    module: Module
    index: number
    courseId: string
    isDeleting: boolean
    onDelete: (id: string) => void
    onTogglePublished: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative" as const,
        zIndex: isDragging ? 50 : undefined,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <ModuleItemContent
                module={module}
                index={index}
                courseId={courseId}
                isDeleting={isDeleting}
                onDelete={onDelete}
                onTogglePublished={onTogglePublished}
                dragHandleProps={{ ...attributes, ...listeners }}
                isDragging={isDragging}
            />
        </div>
    )
}

export function ModuleList({ modules: initialModules, courseId }: { modules: Module[], courseId: string }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [modules, setModules] = useState(initialModules)
    const [isSaving, setIsSaving] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const dndId = useId()

    useEffect(() => {
        setModules(initialModules)
    }, [initialModules])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = modules.findIndex(m => m.id === active.id)
        const newIndex = modules.findIndex(m => m.id === over.id)

        const newModules = arrayMove(modules, oldIndex, newIndex)
        setModules(newModules)

        setIsSaving(true)
        const result = await reorderModules(courseId, newModules.map(m => m.id))
        setIsSaving(false)

        if (!result.success) {
            setModules(initialModules)
        }
    }

    const handleDragCancel = () => {
        setActiveId(null)
    }

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

    const activeModule = activeId ? modules.find(m => m.id === activeId) : null
    const activeIndex = activeId ? modules.findIndex(m => m.id === activeId) : -1

    return (
        <div className="flex flex-col gap-2">
            {isSaving && (
                <div className="text-xs text-muted-foreground text-right animate-pulse">
                    Salvataggio ordine...
                </div>
            )}
            <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <SortableContext
                    items={modules.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {modules.map((module, index) => (
                        <SortableModuleItem
                            key={module.id}
                            module={module}
                            index={index}
                            courseId={courseId}
                            isDeleting={isDeleting === module.id}
                            onDelete={handleDelete}
                            onTogglePublished={handleTogglePublished}
                        />
                    ))}
                </SortableContext>
                <DragOverlay>
                    {activeModule ? (
                        <div className="shadow-2xl opacity-90">
                            <ModuleItemContent
                                module={activeModule}
                                index={activeIndex}
                                courseId={courseId}
                                isDeleting={false}
                                onDelete={() => {}}
                                onTogglePublished={() => {}}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
