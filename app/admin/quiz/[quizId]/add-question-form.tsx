"use client"

import { useActionState, useState } from "react"
import { addQuestion } from "@/app/actions/quiz"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState = {
    message: "",
    success: false
}

export function AddQuestionForm({ quizId }: { quizId: string }) {
    const addQuestionWithId = addQuestion.bind(null, quizId)
    const [state, formAction] = useActionState(addQuestionWithId, initialState)
    const [type, setType] = useState("MULTIPLE_CHOICE")

    return (
        <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="type">Tipo Domanda</Label>
                    <select
                        id="type"
                        name="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                    >
                        <option value="MULTIPLE_CHOICE" className="bg-background text-foreground">Scelta Multipla</option>
                        <option value="TRUE_FALSE" className="bg-background text-foreground">Vero / Falso</option>
                        <option value="MULTI_SELECT" className="bg-background text-foreground">Risposta Multipla (Più opzioni)</option>
                        <option value="SHORT_ANSWER" className="bg-background text-foreground">Risposta Breve (Testo)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="points">Punti</Label>
                    <Input
                        id="points"
                        name="points"
                        type="number"
                        min="1"
                        defaultValue="1"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="question">Domanda</Label>
                <textarea
                    id="question"
                    name="question"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Inserisci la domanda..."
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="explanation">Spiegazione (Opzionale)</Label>
                <textarea
                    id="explanation"
                    name="explanation"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Spiegazione visibile dopo la risposta..."
                />
            </div>

            {type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                    <Label>Opzioni di Risposta</Label>
                    {[0, 1, 2, 3].map((index) => (
                        <Input
                            key={index}
                            name={`option${index}`}
                            placeholder={`Opzione ${String.fromCharCode(65 + index)}`}
                            required
                        />
                    ))}
                </div>
            )}

            {type === "MULTI_SELECT" && (
                <div className="space-y-2">
                    <Label>Opzioni di Risposta (Seleziona quelle corrette)</Label>
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="flex gap-2">
                            <div className="flex items-center h-10">
                                <input
                                    type="checkbox"
                                    name={`correctOption${index}`}
                                    value="true"
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                            </div>
                            <Input
                                name={`option${index}`}
                                placeholder={`Opzione ${String.fromCharCode(65 + index)}`}
                                required
                            />
                        </div>
                    ))}
                </div>
            )}

            {type === "SHORT_ANSWER" && (
                <div className="space-y-2">
                    <Label htmlFor="textAnswer">Risposta Corretta</Label>
                    <Input
                        id="textAnswer"
                        name="textAnswer"
                        placeholder="Inserisci la risposta corretta esatta..."
                        required
                    />
                    <p className="text-xs text-muted-foreground">La risposta sarà verificata senza distinzione tra maiuscole e minuscole.</p>
                </div>
            )}

            {type !== "MULTI_SELECT" && type !== "SHORT_ANSWER" && (
                <div className="space-y-2">
                    <Label htmlFor="correctAnswer">Risposta Corretta</Label>
                    <select
                        id="correctAnswer"
                        name="correctAnswer"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        required
                    >
                        {type === "MULTIPLE_CHOICE" ? (
                            <>
                                <option value="0" className="bg-background text-foreground">Opzione A</option>
                                <option value="1" className="bg-background text-foreground">Opzione B</option>
                                <option value="2" className="bg-background text-foreground">Opzione C</option>
                                <option value="3" className="bg-background text-foreground">Opzione D</option>
                            </>
                        ) : (
                            <>
                                <option value="0" className="bg-background text-foreground">Vero</option>
                                <option value="1" className="bg-background text-foreground">Falso</option>
                            </>
                        )}
                    </select>
                </div>
            )}

            {state?.message && !state.success && (
                <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    {state.message}
                </p>
            )}

            {state?.success && (
                <p className="text-green-600 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    Domanda aggiunta con successo!
                </p>
            )}

            <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 btn-glow text-white"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Aggiungi Domanda
            </Button>
        </form>
    )
}
