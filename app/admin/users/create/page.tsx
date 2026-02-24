import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { CreateUserForm } from "./create-user-form"
import Link from "next/link"

export default async function CreateUserPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const [departments, companies] = await Promise.all([
        db.department.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        }),
        db.company.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })
    ])

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <Link href="/admin/users" className="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla lista utenti
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground mt-2">
                        Aggiungi Nuovo Utente
                    </h1>
                    <p className="text-gray-400 mt-2">Crea un nuovo account utente manualmente</p>
                </div>

                <div className="bg-muted border border-border rounded-xl p-6 backdrop-blur-sm">
                    <CreateUserForm departments={departments} companies={companies} />
                </div>
            </div>
        </div>
    )
}
