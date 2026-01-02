import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { FileText, Download } from "lucide-react"

export default async function EmployeeResourcesPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const resources = await db.resource.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Libreria Risorse
                        </h1>
                        <p className="text-gray-400 mt-2">Documenti e materiali utili per la tua formazione</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead>Titolo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Download</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resources.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        Nessuna risorsa disponibile
                                    </TableCell>
                                </TableRow>
                            ) : (
                                resources.map((res) => (
                                    <TableRow key={res.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                            {res.title}
                                        </TableCell>
                                        <TableCell>{res.fileType}</TableCell>
                                        <TableCell>{res.createdAt.toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Scarica
                                                </Button>
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
