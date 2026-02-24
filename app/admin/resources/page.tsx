import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { revalidatePath } from "next/cache"
import { FileText, Plus, Trash2, Download } from "lucide-react"
import { formatDateOnly } from "@/lib/utils"

export default async function ResourcesPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const resources = await db.resource.findMany({
        orderBy: { createdAt: 'desc' }
    })

    async function createResource(formData: FormData) {
        'use server'
        const title = formData.get("title") as string
        const url = formData.get("url") as string

        if (!title || !url) return

        await db.resource.create({
            data: {
                title,
                fileUrl: url,
                fileType: "External Link", // Simplified for now
            }
        })
        revalidatePath("/admin/resources")
    }

    async function deleteResource(id: string) {
        'use server'
        await db.resource.delete({
            where: { id }
        })
        revalidatePath("/admin/resources")
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Libreria Risorse
                    </h1>
                    <p className="text-gray-400 mt-2">Gestisci i file e le risorse condivise</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Create Form */}
                <div className="md:col-span-1">
                    <div className="bg-muted border border-border rounded-xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">Nuova Risorsa</h2>
                        <form action={createResource} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Titolo</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="es. Manuale Sicurezza 2024"
                                    required
                                    className="bg-muted border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">URL Risorsa</Label>
                                <Input
                                    id="url"
                                    name="url"
                                    placeholder="https://..."
                                    required
                                    className="bg-muted border-border"
                                />
                                <p className="text-xs text-gray-500">Inserisci un link esterno (es. Google Drive, Dropbox)</p>
                            </div>
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Aggiungi
                            </Button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="md:col-span-2">
                    <div className="bg-muted border border-border rounded-xl overflow-hidden backdrop-blur-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead>Titolo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resources.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            Nessuna risorsa trovata
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    resources.map((res) => (
                                        <TableRow key={res.id} className="border-border hover:bg-accent">
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-400" />
                                                {res.title}
                                            </TableCell>
                                            <TableCell>{res.fileType}</TableCell>
                                            <TableCell>{formatDateOnly(res.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </a>
                                                    <form action={deleteResource.bind(null, res.id)}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </form>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    )
}
