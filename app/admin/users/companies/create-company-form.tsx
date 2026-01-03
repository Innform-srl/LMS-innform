"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCompany } from "@/app/actions/companies"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function CreateCompanyForm() {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await createCompany(formData)

        if (result.success) {
            toast({
                title: "Azienda creata",
                description: "L'azienda è stata creata con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
            event.currentTarget.reset()
        } else {
            toast({
                title: "Errore",
                description: result.error,
                variant: "destructive",
            })
        }
        setIsLoading(false)
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Azienda</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Es. Acme Corp"
                    required
                    className="bg-background border-border"
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creazione...
                    </>
                ) : (
                    <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crea Azienda
                    </>
                )}
            </Button>
        </form>
    )
}
