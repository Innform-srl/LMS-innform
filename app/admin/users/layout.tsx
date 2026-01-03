import { UserTabs } from "./user-tabs"

export default function UsersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Gestione Utenti
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gestisci utenti, dipartimenti e aziende della piattaforma
                    </p>
                </div>

                <UserTabs />

                {children}
            </div>
        </div>
    )
}
