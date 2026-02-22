"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Copy, Loader2 } from "lucide-react"
import { getModulesFromOtherCourses, duplicateModule } from "@/app/actions/modules"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ImportModuleDialogProps {
    courseId: string
}

export function ImportModuleDialog({ courseId }: ImportModuleDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [courses, setCourses] = useState<{ id: string; title: string; modules: { id: string; title: string; contentType: string | null }[] }[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState<string>("")
    const [selectedModuleId, setSelectedModuleId] = useState<string>("")
    const router = useRouter()

    const loadCourses = async () => {
        setIsLoading(true)
        const data = await getModulesFromOtherCourses(courseId)
        setCourses(Array.isArray(data) ? data : [])
        setIsLoading(false)
    }

    useEffect(() => {
        if (open) {
            loadCourses()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleImport = async () => {
        if (!selectedModuleId) return

        setIsImporting(true)
        const result = await duplicateModule(selectedModuleId, courseId)
        setIsImporting(false)

        if (result.success) {
            toast.success(result.message)
            setOpen(false)
            setSelectedCourseId("")
            setSelectedModuleId("")
            // Force router to refresh and show updated UI
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const selectedCourse = courses?.find(c => c.id === selectedCourseId)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Copy className="w-4 h-4" />
                    Importa Modulo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Importa Modulo</DialogTitle>
                    <DialogDescription>
                        Copia un modulo da un altro corso esistente.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Seleziona Corso</Label>
                        <Select value={selectedCourseId} onValueChange={(val) => {
                            setSelectedCourseId(val)
                            setSelectedModuleId("")
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Scegli un corso..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">Caricamento...</div>
                                ) : (
                                    courses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCourse && (
                        <div className="space-y-2">
                            <Label>Seleziona Modulo</Label>
                            <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Scegli un modulo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedCourse.modules.length === 0 ? (
                                        <div className="p-2 text-center text-sm text-muted-foreground">Nessun modulo disponibile</div>
                                    ) : (
                                        selectedCourse.modules.map((courseModule: { id: string; title: string; contentType: string | null }) => (
                                            <SelectItem key={courseModule.id} value={courseModule.id}>
                                                {courseModule.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                    <Button onClick={handleImport} disabled={!selectedModuleId || isImporting}>
                        {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Importa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
