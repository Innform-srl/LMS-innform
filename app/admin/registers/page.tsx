import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getRegisters } from "@/app/actions/registers"
import { formatDate } from "@/lib/utils"
import { DeleteRegisterButton } from "./delete-register-button"

const statusLabels: Record<string, string> = {
    DRAFT: "Bozza",
    ACTIVE: "Attivo",
    CLOSED: "Chiuso",
    ARCHIVED: "Archiviato",
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-500/20 text-yellow-600",
    ACTIVE: "bg-green-500/20 text-green-600",
    CLOSED: "bg-red-500/20 text-red-600",
    ARCHIVED: "bg-gray-500/20 text-gray-600",
}

const typeLabels: Record<string, string> = {
    FUNDED: "Finanziato",
    INTERNAL: "Interno",
}

export default async function AdminRegistersPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const registers = await getRegisters()

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Registri d&apos;Aula</h1>
                        <p className="text-muted-foreground">Gestisci i registri presenze e il tracciamento ore</p>
                    </div>
                    <Link href="/admin/registers/create">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            + Nuovo Registro
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4">
                    {registers.length === 0 ? (
                        <Card className="bg-card border-border">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                Nessun registro creato. Crea il primo registro per iniziare.
                            </CardContent>
                        </Card>
                    ) : (
                        registers.map((register) => (
                            <Card key={register.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {register.title}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[register.status]}`}>
                                                    {statusLabels[register.status]}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                    {typeLabels[register.registerType]}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <p>Corso: {register.course.title}</p>
                                                <div className="flex gap-4 mt-1">
                                                    <span>{register._count.participants} partecipanti</span>
                                                    <span>{register._count.entries} giornate</span>
                                                    <span>{register._count.instructors} docenti</span>
                                                    <span>{register.plannedHours}h previste</span>
                                                </div>
                                                {register.projectCode && (
                                                    <p>Codice: {register.projectCode}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Link href={`/admin/registers/${register.id}`}>
                                                <Button variant="outline" size="sm">
                                                    Dettaglio
                                                </Button>
                                            </Link>
                                            {register.status === "DRAFT" && (
                                                <DeleteRegisterButton registerId={register.id} />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
