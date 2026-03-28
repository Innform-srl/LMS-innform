import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { EditionStatusManager } from "./edition-status-manager";
import { EditionEnrollments } from "./edition-enrollments";

const statusLabels: Record<string, string> = {
    planned: "Pianificata",
    open: "Aperta",
    in_progress: "In Corso",
    completed: "Completata",
    cancelled: "Annullata",
};

const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(date: Date | null): string {
    if (!date) return "—";
    return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default async function EditionDetailPage({
    params,
}: {
    params: Promise<{ courseId: string; editionId: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { courseId, editionId } = await params;

    const edition = await db.edition.findUnique({
        where: { id: editionId },
        include: {
            course: { select: { id: true, title: true } },
            enrollments: {
                where: { deletedAt: null },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: { select: { name: true } },
                        },
                    },
                    certificate: {
                        select: { id: true, certificateNumber: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
            classRegisters: {
                select: { id: true, title: true, status: true },
            },
        },
    });

    if (!edition || edition.courseId !== courseId) {
        notFound();
    }

    const completedCount = edition.enrollments.filter((e) => e.completed).length;
    const inProgressCount = edition.enrollments.filter((e) => !e.completed).length;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link
                        href={`/admin/courses/${courseId}`}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        {edition.course.title}
                    </Link>
                </div>

                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">
                            <span className="text-primary">{edition.title}</span>
                        </h1>
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="font-mono text-sm">{edition.code}</span>
                            <Badge className={statusColors[edition.status] || statusColors.planned}>
                                {statusLabels[edition.status] || edition.status}
                            </Badge>
                        </div>
                        {edition.description && <p className="text-muted-foreground mt-2">{edition.description}</p>}
                    </div>
                    <EditionStatusManager editionId={edition.id} currentStatus={edition.status} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Periodo</div>
                        <div className="font-medium mt-1">
                            {formatDate(edition.startDate)} — {formatDate(edition.endDate)}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Iscritti</div>
                        <div className="font-medium mt-1">
                            {edition.enrollments.length} / {edition.maxParticipants}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Completati</div>
                        <div className="font-medium mt-1 text-green-600">{completedCount}</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">In Corso</div>
                        <div className="font-medium mt-1 text-yellow-600">{inProgressCount}</div>
                    </Card>
                </div>

                {/* TMS Info */}
                {(edition.tmsEditionId || edition.tmsClasseId) && (
                    <Card className="p-4 mb-8 bg-muted/20">
                        <div className="text-sm font-medium mb-2">Integrazione SafeInnform</div>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                            {edition.tmsEditionId && (
                                <span>
                                    Edition ID: <code className="font-mono">{edition.tmsEditionId}</code>
                                </span>
                            )}
                            {edition.tmsClasseId && (
                                <span>
                                    Classe ID: <code className="font-mono">{edition.tmsClasseId}</code>
                                </span>
                            )}
                            {edition.tmsSyncedAt && <span>Ultimo sync: {formatDate(edition.tmsSyncedAt)}</span>}
                        </div>
                    </Card>
                )}

                {/* Registri d'Aula collegati */}
                {edition.classRegisters.length > 0 && (
                    <Card className="p-4 mb-8">
                        <div className="text-sm font-medium mb-2">Registri d&apos;Aula</div>
                        <div className="space-y-2">
                            {edition.classRegisters.map((reg) => (
                                <Link
                                    key={reg.id}
                                    href={`/admin/registers/${reg.id}`}
                                    className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
                                >
                                    <span>{reg.title}</span>
                                    <Badge variant="outline">{reg.status}</Badge>
                                </Link>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Gestione Iscritti */}
                <EditionEnrollments
                    courseId={courseId}
                    editionId={editionId}
                    maxParticipants={edition.maxParticipants}
                    initialEnrollments={edition.enrollments.map((e) => ({
                        id: e.id,
                        userId: e.userId,
                        progress: e.progress,
                        completed: e.completed,
                        createdAt: e.createdAt.toISOString(),
                        user: {
                            id: e.user.id,
                            name: e.user.name,
                            email: e.user.email,
                            company: e.user.company,
                        },
                    }))}
                />
            </div>
        </div>
    );
}
