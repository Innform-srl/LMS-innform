import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { RefreshCw, Database } from "lucide-react"

export default async function AdminCertificatesPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; source?: string }>
}) {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "ADMIN") {
        redirect("/")
    }

    const { query, source } = await searchParams
    const searchQuery = query || ""
    const sourceFilter = source || "all"

    // Fetch Course Certificates
    const courseCertificates = await db.certificate.findMany({
        where: {
            ...(searchQuery ? {
                OR: [
                    { enrollment: { user: { name: { contains: searchQuery, mode: 'insensitive' } } } },
                    { enrollment: { user: { email: { contains: searchQuery, mode: 'insensitive' } } } },
                    { enrollment: { course: { title: { contains: searchQuery, mode: 'insensitive' } } } },
                    { certificateNumber: { contains: searchQuery, mode: 'insensitive' } }
                ]
            } : {}),
            ...(sourceFilter === 'lms' ? { source: 'lms' } : {}),
            ...(sourceFilter === 'tms' ? { source: 'tms' } : {})
        },
        include: {
            enrollment: {
                include: {
                    user: true,
                    course: true
                }
            }
        },
        orderBy: { issuedAt: 'desc' }
    })

    // Fetch Quiz Certificates
    const quizCertificates = await db.quizAttempt.findMany({
        where: {
            passed: true,
            ...(searchQuery ? {
                OR: [
                    { user: { name: { contains: searchQuery, mode: 'insensitive' } } },
                    { user: { email: { contains: searchQuery, mode: 'insensitive' } } },
                    { quiz: { title: { contains: searchQuery, mode: 'insensitive' } } },
                    { id: { contains: searchQuery, mode: 'insensitive' } }
                ]
            } : {})
        },
        include: {
            user: true,
            quiz: {
                include: {
                    module: {
                        include: {
                            course: true
                        }
                    }
                }
            }
        },
        orderBy: { completedAt: 'desc' }
    })

    // Combine and sort
    const allCertificates = [
        ...courseCertificates.map(c => ({
            id: c.id,
            type: 'COURSE' as const,
            user: c.enrollment.user,
            title: c.enrollment.course.title,
            date: c.issuedAt,
            number: c.certificateNumber,
            downloadUrl: `/api/certificates/${c.id}/download`,
            verifyUrl: `/verify/${c.certificateNumber}`,
            source: (c.source || 'lms') as 'lms' | 'tms',
            tmsSyncedAt: c.tmsSyncedAt as Date | null
        })),
        ...(sourceFilter !== 'tms' ? quizCertificates.map(q => ({
            id: q.id,
            type: 'QUIZ' as const,
            user: q.user,
            title: q.quiz.title,
            date: q.completedAt,
            number: `QUIZ-${q.id.slice(-6).toUpperCase()}`,
            downloadUrl: `/api/certificate/${q.id}`,
            verifyUrl: `/quiz/${q.quiz.id}/results/${q.id}`,
            source: 'lms' as const,
            tmsSyncedAt: null as Date | null
        })) : [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="p-6 min-h-screen bg-background text-foreground">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Gestione Certificati</h1>
                    <p className="text-muted-foreground">Visualizza e scarica tutti i certificati emessi</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                <form className="flex gap-2">
                    <Input
                        name="query"
                        placeholder="Cerca per utente, corso o numero certificato..."
                        className="max-w-md"
                        defaultValue={searchQuery}
                    />
                    <input type="hidden" name="source" value={sourceFilter} />
                    <Button type="submit">Cerca</Button>
                    {(searchQuery || sourceFilter !== 'all') && (
                        <Link href="/admin/certificates">
                            <Button variant="outline">Reset</Button>
                        </Link>
                    )}
                </form>

                {/* Source Filter */}
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground mr-2">Origine:</span>
                    <Link href={`/admin/certificates?query=${searchQuery}&source=all`}>
                        <Button
                            variant={sourceFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Tutti
                        </Button>
                    </Link>
                    <Link href={`/admin/certificates?query=${searchQuery}&source=lms`}>
                        <Button
                            variant={sourceFilter === 'lms' ? 'default' : 'outline'}
                            size="sm"
                            className={sourceFilter === 'lms' ? '' : ''}
                        >
                            <Database className="w-3 h-3 mr-1" />
                            LMS
                        </Button>
                    </Link>
                    <Link href={`/admin/certificates?query=${searchQuery}&source=tms`}>
                        <Button
                            variant={sourceFilter === 'tms' ? 'default' : 'outline'}
                            size="sm"
                            className={sourceFilter === 'tms' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            TMS
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-md border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Utente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Origine</TableHead>
                            <TableHead>Titolo</TableHead>
                            <TableHead>Data Emissione</TableHead>
                            <TableHead>Numero Certificato</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allCertificates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nessun certificato trovato
                                </TableCell>
                            </TableRow>
                        ) : (
                            allCertificates.map((cert) => (
                                <TableRow key={`${cert.type}-${cert.id}`}>
                                    <TableCell>
                                        <div className="font-medium">{cert.user.name || "Utente"}</div>
                                        <div className="text-xs text-muted-foreground">{cert.user.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${cert.type === 'COURSE'
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-secondary/10 text-secondary-foreground'
                                            }`}>
                                            {cert.type === 'COURSE' ? 'CORSO' : 'QUIZ'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {cert.source === 'tms' ? (
                                            <div className="flex items-center gap-1">
                                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    TMS
                                                </Badge>
                                                {cert.tmsSyncedAt && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(cert.tmsSyncedAt).toLocaleDateString("it-IT")}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">
                                                <Database className="w-3 h-3 mr-1" />
                                                LMS
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{cert.title}</TableCell>
                                    <TableCell>{new Date(cert.date).toLocaleDateString("it-IT")}</TableCell>
                                    <TableCell className="font-mono text-xs">{cert.number}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={cert.downloadUrl} target="_blank">
                                                <Button size="sm" variant="outline">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    PDF
                                                </Button>
                                            </Link>
                                            <Link href={cert.verifyUrl} target="_blank">
                                                <Button size="sm" variant="ghost">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
