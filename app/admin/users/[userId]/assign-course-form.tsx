"use client"

import { assignCourseToUser } from "@/app/actions/enrollments"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Course {
    id: string
    title: string
}

interface AssignCourseFormProps {
    userId: string
    courses: Course[]
}

export function AssignCourseForm({ userId, courses }: AssignCourseFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCourseId, setSelectedCourseId] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    async function handleAssign() {
        if (!selectedCourseId) return

        setIsLoading(true)
        const result = await assignCourseToUser(userId, selectedCourseId)

        if (result.success) {
            toast({
                title: "Corso assegnato",
                description: "L'utente è stato iscritto al corso con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            setSelectedCourseId("")
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
        }
        setIsLoading(false)
    }

    return (
        <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
                <Label className="text-foreground">Assegna un nuovo corso</Label>
                <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    disabled={isLoading}
                >
                    <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <SelectValue placeholder="Seleziona un corso..." />
                    </SelectTrigger>
                    <SelectContent>
                        {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button
                onClick={handleAssign}
                disabled={!selectedCourseId || isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <Plus className="w-4 h-4 mr-2" />
                        Assegna
                    </>
                )}
            </Button>
        </div>
    )
}
