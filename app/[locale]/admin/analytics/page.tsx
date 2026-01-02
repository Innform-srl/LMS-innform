import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default async function AdminAnalyticsPage() {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/")
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    Monitora le performance della piattaforma e degli utenti.
                </p>
            </div>

            <AnalyticsDashboard />
        </div>
    )
}
