"use client"

import { createLearningPath } from "@/app/actions/learning-paths"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface Department {
    id: string
    name: string
}

interface Company {
    id: string
    name: string
}

interface CreateLearningPathFormProps {
    departments: Department[]
    companies: Company[]
}

export function CreateLearningPathForm({ departments, companies }: CreateLearningPathFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await createLearningPath(formData)

        if (result.success) {
            toast({
                title: "Percorso creato",
                description: "Il percorso di apprendimento è stato creato con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.push("/admin/learning-paths")
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.error,
                variant: "destructive",
            })
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">Titolo Percorso *</Label>
                <Input
                    id="title"
                    name="title"
                    placeholder="Es: Onboarding Neoassunti"
                    className="bg-muted border-border focus:border-primary"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">Descrizione</Label>
                <textarea
                    id="description"
                    name="description"
                    placeholder="Descrizione del percorso..."
                    className="flex min-h-[100px] w-full rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="departmentId" className="text-gray-200">Dipartimento Target (Opzionale)</Label>
                    <select
                        id="departmentId"
                        name="departmentId"
                        className="w-full h-10 rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-white"
                    >
                        <option value="">Nessun Dipartimento</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">Suggerito per utenti di questo dipartimento</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="companyId" className="text-gray-200">Azienda Target (Opzionale)</Label>
                    <select
                        id="companyId"
                        name="companyId"
                        className="w-full h-10 rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-white"
                    >
                        <option value="">Nessuna Azienda</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">Suggerito per utenti di questa azienda</p>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creazione...
                        </>
                    ) : (
                        "Crea Percorso"
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="border-border hover:bg-accent"
                    onClick={() => router.back()}
                    disabled={isLoading}
                >
                    Annulla
                </Button>
            </div>
        </form>
    )
}
