"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/app/actions/users"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface Department {
    id: string
    name: string
}

import { getSuggestedLearningPaths } from "@/app/actions/learning-paths"

interface Company {
    id: string
    name: string
}

interface CreateUserFormProps {
    departments: Department[]
    companies: Company[]
}

export function CreateUserForm({ departments, companies }: CreateUserFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [suggestedPaths, setSuggestedPaths] = useState<{ id: string; title: string; company?: { name: string } | null; department?: { name: string } | null }[]>([])
    const [selectedPaths, setSelectedPaths] = useState<string[]>([])

    const [selectedDepartment, setSelectedDepartment] = useState<string>("")
    const [selectedCompany, setSelectedCompany] = useState<string>("")

    // Fetch suggestions when selection changes
    async function updateSuggestions(deptId: string, compId: string) {
        if (!deptId && !compId) {
            setSuggestedPaths([])
            return
        }
        const paths = await getSuggestedLearningPaths(compId || undefined, deptId || undefined)
        setSuggestedPaths(paths)
        // Auto-select new suggestions
        setSelectedPaths(prev => {
            const newIds = paths.map(p => p.id)
            return [...new Set([...prev, ...newIds])]
        })
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        selectedPaths.forEach(id => formData.append("learningPathIds", id))

        const result = await createUser(formData)

        if (result.success) {
            toast({
                title: "Utente creato",
                description: "L'utente è stato creato con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.push("/admin/users")
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
        <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Mario Rossi"
                    required
                    className="bg-background border-border"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="mario.rossi@example.com"
                    required
                    className="bg-background border-border"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-background border-border"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Ruolo</Label>
                    <select
                        id="role"
                        name="role"
                        className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        required
                    >
                        <option value="EMPLOYEE">Dipendente</option>
                        <option value="TEACHER">Docente</option>
                        <option value="ADMIN">Amministratore</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="departmentId">Dipartimento</Label>
                    <select
                        id="departmentId"
                        name="departmentId"
                        className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onChange={(e) => {
                            setSelectedDepartment(e.target.value)
                            updateSuggestions(e.target.value, selectedCompany)
                        }}
                    >
                        <option value="">Nessun Dipartimento</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="companyId">Azienda</Label>
                    <select
                        id="companyId"
                        name="companyId"
                        className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onChange={(e) => {
                            setSelectedCompany(e.target.value)
                            updateSuggestions(selectedDepartment, e.target.value)
                        }}
                    >
                        <option value="">Nessuna Azienda</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {suggestedPaths.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                    <Label className="text-primary">Percorsi Suggeriti</Label>
                    <div className="grid gap-2">
                        {suggestedPaths.map(path => (
                            <div key={path.id} className="flex items-start space-x-3 bg-muted/50 p-3 rounded-lg border border-border">
                                <input
                                    type="checkbox"
                                    id={`path-${path.id}`}
                                    checked={selectedPaths.includes(path.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedPaths([...selectedPaths, path.id])
                                        } else {
                                            setSelectedPaths(selectedPaths.filter(id => id !== path.id))
                                        }
                                    }}
                                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                />
                                <div>
                                    <label htmlFor={`path-${path.id}`} className="text-sm font-medium text-foreground block">
                                        {path.title}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {path.company ? `Azienda: ${path.company.name}` : ''}
                                        {path.company && path.department ? ' • ' : ''}
                                        {path.department ? `Dipartimento: ${path.department.name}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-4 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-border hover:bg-accent hover:text-accent-foreground"
                    disabled={isLoading}
                >
                    Annulla
                </Button>
                <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creazione...
                        </>
                    ) : (
                        "Crea Utente"
                    )}
                </Button>
            </div>
        </form>
    )
}
