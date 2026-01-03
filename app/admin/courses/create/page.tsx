"use client"

import { useState, useEffect } from "react"
import { createCourse } from "@/app/actions/courses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCompanies, getDepartments } from "@/app/actions/organizations"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function CreateCoursePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [description, setDescription] = useState("")
    const [companies, setCompanies] = useState<{ id: string, name: string }[]>([])
    const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])
    const [error, setError] = useState("")

    useEffect(() => {
        Promise.all([getCompanies(), getDepartments()])
            .then(([c, d]) => {
                setCompanies(c)
                setDepartments(d)
            })
    }, [])

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError("")

        const result = await createCourse(null, formData)

        if (result.success) {
            toast({
                title: "Corso creato!",
                description: "Il corso è stato creato con successo. Lo trovi nella sezione Bozze.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.push("/admin/courses")
            router.refresh()
        } else {
            setError(result.message || "Errore durante la creazione")
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
            setIsLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Crea Nuovo Corso</h1>

            <form action={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="title">Titolo del Corso</Label>
                    <Input id="title" name="title" placeholder="Es. Sicurezza sul Lavoro" required disabled={isLoading} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="Descrizione del corso..."
                    />
                    <input type="hidden" name="description" value={description} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="companyId">Azienda (Opzionale)</Label>
                        <Select name="companyId" disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Azienda" />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Assegna automaticamente a tutti i dipendenti dell'azienda.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="departmentId">Dipartimento (Opzionale)</Label>
                        <Select name="departmentId" disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Dipartimento" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Assegna automaticamente a tutti i membri del dipartimento.</p>
                    </div>
                </div>

                {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                )}

                <div className="flex gap-4">
                    <Link href="/admin/courses">
                        <Button variant="outline" type="button" disabled={isLoading}>Annulla</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creazione...
                            </>
                        ) : (
                            "Crea Corso"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
