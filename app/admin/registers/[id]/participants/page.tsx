import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getRegister, getAvailableUsersForRegister } from "@/app/actions/registers"
import { ParticipantsManager } from "./participants-manager"

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { id } = await params
    const register = await getRegister(id)
    if (!register) notFound()

    const availableUsers = await getAvailableUsersForRegister(id)
    const isEditable = register.status !== "CLOSED" && register.status !== "ARCHIVED"

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-1 text-sm">
                    <Link href="/admin/registers" className="text-muted-foreground hover:text-foreground">
                        Registri
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <Link href={`/admin/registers/${id}`} className="text-muted-foreground hover:text-foreground">
                        {register.title}
                    </Link>
                    <span className="text-muted-foreground">/</span>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Gestione Partecipanti</h1>
                    <p className="text-muted-foreground mt-1">
                        {register.participants.length} partecipanti - {register.plannedHours}h previste - Soglia {register.complianceThreshold}%
                    </p>
                </div>

                <ParticipantsManager
                    register={register}
                    availableUsers={availableUsers}
                    isEditable={isEditable}
                />
            </div>
        </div>
    )
}
