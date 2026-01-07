import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        }
    })

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Impostazioni</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestisci le impostazioni del tuo account
                    </p>
                </div>

                <SettingsForm user={user} />
            </div>
        </div>
    )
}
