import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { CreateLearningPathForm } from "./create-learning-path-form"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CreateLearningPathPage() {
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
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-2xl mx-auto">
                <Link
                    href="/admin/learning-paths"
                    className="text-sm text-muted-foreground hover:text-foreground mb-4 block"
                >
                    ← Torna ai percorsi
                </Link>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl text-foreground">
                            Nuovo Percorso
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CreateLearningPathForm departments={departments} companies={companies} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
