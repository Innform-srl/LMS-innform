"use client"

import { generateQuizQuestions } from "@/app/actions/ai-quiz"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Sparkles, Wand2 } from "lucide-react"
import { useState } from "react"

interface AiQuizGeneratorProps {
    onQuestionsGenerated: (questions: { question: string; options: string[]; correctAnswer: number }[]) => void
}

export function AiQuizGenerator({ onQuestionsGenerated }: AiQuizGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [topic, setTopic] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    async function handleGenerate() {
        if (!topic.trim()) return

        setIsLoading(true)
        try {
            const result = await generateQuizQuestions(topic)

            if (result.success && result.questions) {
                onQuestionsGenerated(result.questions)
                setIsOpen(false)
                toast({
                    title: "Domande generate!",
                    description: `L'AI ha creato ${result.questions.length} domande per te.`,
                    className: "bg-green-500 border-green-600 text-white",
                })
            } else {
                toast({
                    title: "Errore",
                    description: result.error || "Impossibile generare le domande.",
                    variant: "destructive",
                })
            }
        } catch (_error) {
            toast({
                title: "Errore",
                description: "Si è verificato un errore imprevisto.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-indigo-200 w-full mb-6 group"
                >
                    <Sparkles className="w-4 h-4 mr-2 text-indigo-400 group-hover:animate-pulse" />
                    Genera Quiz con AI
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wand2 className="w-5 h-5 text-indigo-500" />
                        Generatore AI
                    </DialogTitle>
                    <DialogDescription>
                        Descrivi l&apos;argomento del quiz o incolla il testo della lezione. L&apos;AI genererà automaticamente 5 domande a risposta multipla.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic">Argomento o Contenuto</Label>
                        <Textarea
                            id="topic"
                            placeholder="Es: I principi della sicurezza sul lavoro, oppure incolla qui il testo del modulo..."
                            className="min-h-[150px] resize-none"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!topic.trim() || isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generazione in corso...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Genera Domande
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
