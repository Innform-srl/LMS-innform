import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, BookOpen, GraduationCap, RefreshCw, Download, ExternalLink } from "lucide-react"

export default async function CertificatesPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    // Get all certificates for current user
    const courseCertificates = await db.certificate.findMany({
        where: {
            enrollment: {
                userId: session.user.id
            }
        },
        include: {
            enrollment: {
                include: {
                    course: {
                        select: {
                            title: true,
                            description: true
                        }
                    }
                }
            }
        },
        orderBy: {
            issuedAt: "desc"
        }
    })

    // Get all passed quiz attempts
    const quizCertificates = await db.quizAttempt.findMany({
        where: {
            userId: session.user.id,
            passed: true
        },
        include: {
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
        orderBy: {
            completedAt: "desc"
        }
    })

    // Combine and sort
    const allCertificates = [
        ...courseCertificates.map(c => ({
            id: c.id,
            type: 'COURSE' as const,
            title: c.enrollment.course.title,
            date: c.issuedAt,
            number: c.certificateNumber,
            downloadUrl: `/api/certificates/${c.id}/download`,
            verifyUrl: `/verify/${c.certificateNumber}`,
            subtitle: "Certificato di Completamento Corso",
            source: (c.source || 'lms') as 'lms' | 'tms',
            tmsSyncedAt: c.tmsSyncedAt as Date | null
        })),
        ...quizCertificates.map(q => ({
            id: q.id,
            type: 'QUIZ' as const,
            title: q.quiz.title,
            date: q.completedAt,
            number: `QUIZ-${q.id.slice(-6).toUpperCase()}`,
            downloadUrl: `/api/certificate/${q.id}`,
            verifyUrl: `/quiz/${q.quiz.id}/results/${q.id}`,
            subtitle: `Quiz: ${q.quiz.module.course.title}`,
            source: 'lms' as const,
            tmsSyncedAt: null as Date | null
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Stats
    const courseCount = allCertificates.filter(c => c.type === 'COURSE').length
    const quizCount = allCertificates.filter(c => c.type === 'QUIZ').length
    const tmsSyncedCount = allCertificates.filter(c => c.source === 'tms').length

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Torna alla Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="text-primary">Portfolio Certificati</span>
                    </h1>
                    <p className="text-muted-foreground">
                        I tuoi traguardi formativi e certificazioni ottenute
                    </p>
                </div>

                {/* Stats Cards */}
                {allCertificates.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-primary" />
                                    <CardDescription>Totale</CardDescription>
                                </div>
                                <CardTitle className="text-3xl">{allCertificates.length}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-blue-500" />
                                    <CardDescription>Corsi</CardDescription>
                                </div>
                                <CardTitle className="text-3xl text-blue-500">{courseCount}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-green-500" />
                                    <CardDescription>Quiz</CardDescription>
                                </div>
                                <CardTitle className="text-3xl text-green-500">{quizCount}</CardTitle>
                            </CardHeader>
                        </Card>
                        {tmsSyncedCount > 0 && (
                            <Card className="border-purple-500/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-5 h-5 text-purple-500" />
                                        <CardDescription>Sincronizzati TMS</CardDescription>
                                    </div>
                                    <CardTitle className="text-3xl text-purple-500">{tmsSyncedCount}</CardTitle>
                                </CardHeader>
                            </Card>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {allCertificates.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Nessun Certificato Ancora</h3>
                        <p className="text-muted-foreground mb-6">Completa i corsi e i quiz per ottenere i tuoi certificati!</p>
                        <Link href="/courses">
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Esplora Corsi
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Certificates Grid */}
                {allCertificates.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allCertificates.map((certificate) => (
                            <div
                                key={`${certificate.type}-${certificate.id}`}
                                className="glass border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
                            >
                                {/* Certificate Card */}
                                <div className={`p-6 ${certificate.type === 'COURSE' ? 'bg-primary/5' : 'bg-secondary/5'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${certificate.type === 'COURSE' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                                            {certificate.type === 'COURSE' ? (
                                                <GraduationCap className="w-6 h-6" />
                                            ) : (
                                                <BookOpen className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="text-xs text-muted-foreground block">
                                                {new Date(certificate.date).toLocaleDateString("it-IT")}
                                            </span>
                                            <div className="flex gap-1 justify-end">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${certificate.type === 'COURSE' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
                                                    {certificate.type === 'COURSE' ? 'CORSO' : 'QUIZ'}
                                                </span>
                                                {certificate.source === 'tms' && (
                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5">
                                                        <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                                                        TMS
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">
                                        {certificate.title}
                                    </h3>

                                    <p className="text-sm text-muted-foreground mb-4">
                                        {certificate.subtitle}
                                    </p>

                                    <p className="text-xs text-muted-foreground mb-4 font-mono">
                                        ID: {certificate.number}
                                    </p>

                                    <div className="flex flex-col gap-2">
                                        <Link href={certificate.downloadUrl} target="_blank">
                                            <Button className={`w-full ${certificate.type === 'COURSE' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Download PDF
                                            </Button>
                                        </Link>

                                        <Link href={certificate.verifyUrl} target="_blank">
                                            <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Verifica Online
                                            </Button>
                                        </Link>
                                    </div>

                                    {certificate.tmsSyncedAt && (
                                        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3" />
                                            Sincronizzato: {new Date(certificate.tmsSyncedAt).toLocaleDateString("it-IT")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
