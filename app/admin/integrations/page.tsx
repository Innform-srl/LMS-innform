import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    ArrowLeft,
    Webhook,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Stethoscope
} from "lucide-react"

function getStatusBadge(status: string) {
    switch (status) {
        case "success":
            return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>
        case "failed":
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
        case "retry":
            return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><RefreshCw className="w-3 h-3 mr-1" />Retry</Badge>
        case "pending":
            return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
        default:
            return <Badge variant="secondary">{status}</Badge>
    }
}

function getDirectionIcon(direction: string) {
    if (direction === "incoming") {
        return <ArrowDownLeft className="w-4 h-4 text-blue-400" />
    }
    return <ArrowUpRight className="w-4 h-4 text-primary" />
}

export default async function IntegrationsPage() {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/login")
    }

    // Get webhook stats
    const [
        totalWebhooks,
        successfulWebhooks,
        failedWebhooks,
        pendingRetries,
        recentWebhooks,
        courseMappings
    ] = await Promise.all([
        db.webhookEvent.count(),
        db.webhookEvent.count({ where: { status: "success" } }),
        db.webhookEvent.count({ where: { status: "failed" } }),
        db.webhookEvent.count({ where: { status: "retry" } }),
        db.webhookEvent.findMany({
            take: 20,
            orderBy: { createdAt: "desc" }
        }),
        db.courseTMSMapping.findMany({
            include: {
                course: { select: { title: true } }
            },
            orderBy: { createdAt: "desc" }
        })
    ])

    const successRate = totalWebhooks > 0
        ? Math.round((successfulWebhooks / totalWebhooks) * 100)
        : 0

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm" className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Torna alla Dashboard
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Webhook className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Integrazioni TMS</h1>
                            <p className="text-muted-foreground">Gestione webhook e sincronizzazione con Training Management System</p>
                        </div>
                    </div>
                    <Link href="/admin/integrations/diagnostics">
                        <Button variant="outline" className="mt-4">
                            <Stethoscope className="w-4 h-4 mr-2" />
                            Diagnostica Webhook
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Totale Webhook</CardDescription>
                            <CardTitle className="text-3xl">{totalWebhooks}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Successo</CardDescription>
                            <CardTitle className="text-3xl text-green-400">{successfulWebhooks}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Falliti</CardDescription>
                            <CardTitle className="text-3xl text-red-400">{failedWebhooks}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="glass border-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Tasso Successo</CardDescription>
                            <CardTitle className="text-3xl text-primary">{successRate}%</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Webhooks */}
                    <div className="lg:col-span-2">
                        <Card className="glass border-border">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Webhook Recenti</CardTitle>
                                        <CardDescription>Ultimi 20 eventi webhook</CardDescription>
                                    </div>
                                    {pendingRetries > 0 && (
                                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            {pendingRetries} in retry
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {recentWebhooks.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Nessun webhook registrato</p>
                                        <p className="text-sm">I webhook appariranno qui quando verranno inviati o ricevuti</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentWebhooks.map((webhook) => (
                                            <div
                                                key={webhook.id}
                                                className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border hover:bg-accent/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getDirectionIcon(webhook.direction)}
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {webhook.source.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm">{webhook.eventType}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(webhook.createdAt).toLocaleString("it-IT")}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(webhook.status)}
                                                    {webhook.retryCount > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({webhook.retryCount} retry)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Course Mappings */}
                    <div>
                        <Card className="glass border-border">
                            <CardHeader>
                                <CardTitle>Mapping Corsi</CardTitle>
                                <CardDescription>Corsi sincronizzati con TMS</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {courseMappings.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">Nessun mapping configurato</p>
                                        <p className="text-xs mt-1">I mapping vengono creati automaticamente quando TMS invia iscrizioni</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {courseMappings.map((mapping) => (
                                            <div
                                                key={mapping.id}
                                                className="p-3 rounded-lg bg-card/50 border border-border"
                                            >
                                                <div className="font-medium text-sm truncate">
                                                    {mapping.course.title}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {mapping.tmsCourseCode || mapping.tmsCourseId}
                                                    </Badge>
                                                    {mapping.syncEnabled ? (
                                                        <Badge className="bg-green-500/20 text-green-400 text-xs">Sync ON</Badge>
                                                    ) : (
                                                        <Badge className="bg-gray-500/20 text-gray-400 text-xs">Sync OFF</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Configuration Info */}
                        <Card className="glass border-border mt-4">
                            <CardHeader>
                                <CardTitle className="text-sm">Configurazione</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Endpoint webhook:</span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">/api/webhooks/tms</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cron sync:</span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">/api/cron/tms-sync</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Max retry:</span>
                                    <span>3 tentativi</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
