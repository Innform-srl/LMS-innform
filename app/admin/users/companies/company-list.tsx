"use client"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { deleteCompany } from "@/app/actions/companies"
import { useToast } from "@/components/ui/use-toast"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Company {
    id: string
    name: string
    _count: {
        users: number
    }
}

interface CompanyListProps {
    companies: Company[]
}

export function CompanyList({ companies }: CompanyListProps) {
    const router = useRouter()
    const { toast } = useToast()

    async function handleDelete(id: string) {
        if (!confirm("Sei sicuro di voler eliminare questa azienda?")) return

        const result = await deleteCompany(id)

        if (result.success) {
            toast({
                title: "Azienda eliminata",
                description: "L'azienda è stata eliminata con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.error,
                variant: "destructive",
            })
        }
    }

    return (
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Nome Azienda</TableHead>
                    <TableHead className="text-center">Utenti</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companies.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Nessuna azienda trovata
                        </TableCell>
                    </TableRow>
                ) : (
                    companies.map((company) => (
                        <TableRow key={company.id} className="border-border hover:bg-muted/50">
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell className="text-center">
                                <span className="bg-muted px-2 py-1 rounded-full text-xs">
                                    {company._count.users}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(company.id)}
                                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                    disabled={company._count.users > 0}
                                    title={company._count.users > 0 ? "Impossibile eliminare: ci sono utenti associati" : "Elimina"}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}
