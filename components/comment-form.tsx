"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface CommentFormProps {
    courseId?: string
    moduleId?: string
}

export function CommentForm({ courseId, moduleId }: CommentFormProps) {
    const [content, setContent] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleSubmit = async () => {
        if (!content.trim()) return

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    courseId,
                    moduleId
                })
            })

            if (!response.ok) throw new Error("Errore durante l'invio")

            setContent("")
            router.refresh()
            toast({
                title: "Commento inviato",
                description: "Il tuo commento è stato pubblicato con successo."
            })
        } catch (error) {
            toast({
                title: "Errore",
                description: "Non è stato possibile inviare il commento.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="glass border-border rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Lascia un commento</h3>
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Condividi i tuoi pensieri o fai una domanda..."
                className="bg-muted/50 border-border min-h-[100px] mb-4"
            />
            <div className="flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !content.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    Pubblica Commento
                </Button>
            </div>
        </div>
    )
}
