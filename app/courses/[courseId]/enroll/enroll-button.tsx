"use client"

import { useState } from "react"
import { enrollInCourse } from "@/app/actions/enrollments"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export function EnrollButton({ courseId }: { courseId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleEnroll = async () => {
        console.log("Enroll button clicked for course:", courseId)
        setIsLoading(true)
        try {
            console.log("Calling server action...")
            const result = await enrollInCourse(courseId)
            console.log("Server action result:", result)

            if (result.success) {
                toast({
                    title: "Iscrizione completata",
                    description: "Ti sei iscritto al corso con successo!",
                })
                router.push(`/courses/${courseId}`)
                router.refresh()
            } else {
                if (result.message?.includes("Sessione non valida") || result.message?.includes("Non autorizzato")) {
                    toast({
                        variant: "destructive",
                        title: "Sessione Scaduta",
                        description: "Verrai reindirizzato al login...",
                    })
                    setTimeout(() => {
                        window.location.href = "/lms/api/auth/signin"
                    }, 1500)
                    return
                }
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: result.message || "Impossibile iscriversi al corso",
                })
            }
        } catch (_error) {
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Si è verificato un errore imprevisto",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handleEnroll}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20"
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iscrizione in corso...
                </>
            ) : (
                <>
                    Inizia il Corso
                    <ArrowRight className="ml-2 h-5 w-5" />
                </>
            )}
        </Button>
    )
}
