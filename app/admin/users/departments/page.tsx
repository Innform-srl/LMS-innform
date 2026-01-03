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
import { Plus, Trash2 } from "lucide-react"

export default async function DepartmentsPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const departments = await db.department.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    async function createDepartment(formData: FormData) {
        'use server'
        const name = formData.get("name") as string
        if (!name) return

        await db.department.create({
            data: { name }
        })
        revalidatePath("/admin/users/departments")
    }

    async function deleteDepartment(id: string) {
        'use server'
        await db.department.delete({
            where: { id }
        })
        revalidatePath("/admin/users/departments")
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Create Form */}
                <div className="md:col-span-1">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">Nuovo Dipartimento</h2>
                        <form action={createDepartment} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-foreground">Nome Dipartimento</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="es. Marketing, IT, HR"
                                    required
                                    className="bg-background border-border text-foreground"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Crea
                            </Button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="md:col-span-2">
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-muted-foreground">Nome</TableHead>
                                    <TableHead className="text-muted-foreground">Utenti</TableHead>
                                    <TableHead className="text-muted-foreground">Creato il</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Nessun dipartimento trovato
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    departments.map((dept) => (
                                        <TableRow key={dept.id} className="border-border hover:bg-muted/50">
                                            <TableCell className="font-medium text-foreground">{dept.name}</TableCell>
                                            <TableCell className="text-foreground">{dept._count.users}</TableCell>
                                            <TableCell className="text-foreground">{dept.createdAt.toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <form action={deleteDepartment.bind(null, dept.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        disabled={dept._count.users > 0}
                                                        title={dept._count.users > 0 ? "Impossibile eliminare: ci sono utenti assegnati" : "Elimina"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </form>
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
