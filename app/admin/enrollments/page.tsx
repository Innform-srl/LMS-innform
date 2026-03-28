import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";
import { NewEnrollmentDialog } from "./new-enrollment-dialog";

export default async function EnrollmentsOverviewPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    // Get all enrollments with user and course info
    const allEnrollments = await db.enrollment.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            course: {
                select: {
                    id: true,
                    title: true,
                },
            },
            edition: {
                select: {
                    id: true,
                    code: true,
                    title: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Calculate days until deadline
    const now = new Date();
    const getDaysUntilDeadline = (dueDate: Date | null) => {
        if (!dueDate) return null;
        const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    // Add calculated fields
    const enrichedEnrollments = allEnrollments.map((e) => {
        const daysUntil = e.dueDate ? getDaysUntilDeadline(e.dueDate) : null;
        let status = "IN_CORSO";
        let statusColor = "blue";

        if (e.completed) {
            status = "COMPLETATO";
            statusColor = "green";
        } else if (daysUntil !== null && daysUntil < 0) {
            status = "SCADUTO";
            statusColor = "red";
        } else if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7) {
            status = "IN_SCADENZA";
            statusColor = "orange";
        } else if (e.progress > 0 && e.progress < 100) {
            status = "SOSPESO";
            statusColor = "yellow";
        }

        return {
            ...e,
            daysUntil,
            status,
            statusColor,
        };
    });

    // Count by status
    const stats = {
        total: allEnrollments.length,
        completati: enrichedEnrollments.filter((e) => e.status === "COMPLETATO").length,
        inScadenza: enrichedEnrollments.filter((e) => e.status === "IN_SCADENZA").length,
        scaduti: enrichedEnrollments.filter((e) => e.status === "SCADUTO").length,
        sospesi: enrichedEnrollments.filter((e) => e.status === "SOSPESO").length,
        inCorso: enrichedEnrollments.filter((e) => e.status === "IN_CORSO").length,
        tmsSynced: allEnrollments.filter((e) => e.tmsEnrollmentId).length,
    };

    const getStatusBadge = (status: string, _statusColor: string) => {
        const configs: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
            COMPLETATO: {
                bg: "bg-green-500/10",
                text: "text-green-600",
                border: "border-green-500/30",
                icon: "✓",
                label: "Completato",
            },
            SCADUTO: {
                bg: "bg-red-500/10",
                text: "text-red-600",
                border: "border-red-500/30",
                icon: "❌",
                label: "Scaduto",
            },
            IN_SCADENZA: {
                bg: "bg-orange-500/10",
                text: "text-orange-600",
                border: "border-orange-500/30",
                icon: "⏰",
                label: "In Scadenza",
            },
            SOSPESO: {
                bg: "bg-yellow-500/10",
                text: "text-yellow-600",
                border: "border-yellow-500/30",
                icon: "⏸",
                label: "Sospeso",
            },
            IN_CORSO: {
                bg: "bg-blue-500/10",
                text: "text-blue-600",
                border: "border-blue-500/30",
                icon: "▶",
                label: "In Corso",
            },
        };
        const config = configs[status] || configs.IN_CORSO;
        return (
            <span
                className={`px-2 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded border ${config.border} inline-flex items-center gap-1`}
            >
                <span>{config.icon}</span>
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Dashboard Admin
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Panoramica Iscrizioni</h1>
                            <p className="text-muted-foreground">Vista completa di tutti gli enrollment per stato</p>
                        </div>
                        <NewEnrollmentDialog />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
                    <Card className="p-4 border-2">
                        <div className="text-sm text-muted-foreground mb-1">Totali</div>
                        <div className="text-3xl font-bold">{stats.total}</div>
                    </Card>
                    <Card className="p-4 border-2 border-green-500/30">
                        <div className="text-sm text-green-600 mb-1 font-medium">Completati</div>
                        <div className="text-3xl font-bold text-green-600">{stats.completati}</div>
                    </Card>
                    <Card className="p-4 border-2 border-red-500/30">
                        <div className="text-sm text-red-600 mb-1 font-medium">Scaduti</div>
                        <div className="text-3xl font-bold text-red-600">{stats.scaduti}</div>
                    </Card>
                    <Card className="p-4 border-2 border-orange-500/30">
                        <div className="text-sm text-orange-600 mb-1 font-medium">In Scadenza</div>
                        <div className="text-3xl font-bold text-orange-600">{stats.inScadenza}</div>
                    </Card>
                    <Card className="p-4 border-2 border-yellow-500/30">
                        <div className="text-sm text-yellow-600 mb-1 font-medium">Sospesi</div>
                        <div className="text-3xl font-bold text-yellow-600">{stats.sospesi}</div>
                    </Card>
                    <Card className="p-4 border-2 border-blue-500/30">
                        <div className="text-sm text-blue-600 mb-1 font-medium">In Corso</div>
                        <div className="text-3xl font-bold text-blue-600">{stats.inCorso}</div>
                    </Card>
                    <Card className="p-4 border-2 border-primary/30">
                        <div className="text-sm text-primary mb-1 font-medium flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> TMS Sync
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.tmsSynced}</div>
                    </Card>
                </div>

                {/* Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utente</TableHead>
                                <TableHead>Corso</TableHead>
                                <TableHead>Edizione</TableHead>
                                <TableHead>Stato</TableHead>
                                <TableHead className="text-right">Progresso</TableHead>
                                <TableHead>Scadenza</TableHead>
                                <TableHead>TMS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrichedEnrollments.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell>
                                        <Link
                                            href={`/admin/users/${e.user.id}`}
                                            className="hover:underline font-medium"
                                        >
                                            {e.user.name || e.user.email}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{e.course.title}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {e.edition ? <span className="font-mono text-xs">{e.edition.code}</span> : "—"}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(e.status, e.statusColor)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="font-mono text-sm">{Math.round(e.progress)}%</span>
                                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${e.statusColor === "green" ? "bg-green-500" : e.statusColor === "red" ? "bg-red-500" : e.statusColor === "orange" ? "bg-orange-500" : e.statusColor === "yellow" ? "bg-yellow-500" : "bg-blue-500"}`}
                                                    style={{ width: `${e.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {e.dueDate ? (
                                            <div className="text-sm">
                                                <div>{formatDateOnly(new Date(e.dueDate))}</div>
                                                {e.daysUntil !== null && (
                                                    <div
                                                        className={`text-xs ${e.daysUntil < 0 ? "text-red-500" : e.daysUntil <= 7 ? "text-orange-500" : "text-muted-foreground"}`}
                                                    >
                                                        {e.daysUntil < 0
                                                            ? `Scaduto ${Math.abs(e.daysUntil)}gg fa`
                                                            : `Tra ${e.daysUntil}gg`}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {e.tmsEnrollmentId ? (
                                            <div className="flex items-center gap-1">
                                                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Sync
                                                </Badge>
                                                {e.tmsSyncedAt && (
                                                    <span
                                                        className="text-xs text-muted-foreground"
                                                        title={`ID: ${e.tmsEnrollmentId}`}
                                                    >
                                                        {formatDateOnly(new Date(e.tmsSyncedAt))}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}
