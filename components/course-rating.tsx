'use client'

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitRating } from "@/app/actions/ratings"
import { useToast } from "@/components/ui/use-toast"

export function CourseRating({ courseId, initialRating, initialComment }: { courseId: string, initialRating?: number, initialComment?: string }) {
    const [rating, setRating] = useState(initialRating || 0)
    const [comment, setComment] = useState(initialComment || "")
    const [hoveredRating, setHoveredRating] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    async function handleSubmit() {
        if (rating === 0) return

        setIsSubmitting(true)
        try {
            await submitRating(courseId, rating, comment)
            toast({
                title: "Grazie!",
                description: "La tua valutazione è stata salvata.",
            })
        } catch (error) {
            toast({
                title: "Errore",
                description: "Non è stato possibile salvare la valutazione.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="glass border-border rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Valuta questo corso</h3>

            <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        <Star
                            className={`w-8 h-8 ${star <= (hoveredRating || rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                                }`}
                        />
                    </button>
                ))}
            </div>

            <Textarea
                placeholder="Scrivi un commento (opzionale)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-muted/50 border-border mb-4 min-h-[100px]"
            />

            <Button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
                {isSubmitting ? "Salvataggio..." : "Invia Valutazione"}
            </Button>
        </div>
    )
}
