import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Clock, Calendar, CheckCircle } from "lucide-react"

export default async function EnrollPage({ params }: { params: Promise<{ courseId: string }> }) {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const courseId = (await params).courseId

    const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                where: { published: true },
                orderBy: { position: "asc" }
            }
        }
    })

    if (!course) return redirect("/courses")

    // Check if already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: course.id
            }
        }
    })

    if (existingEnrollment) {
        return redirect(`/courses/${course.id}`)
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-3xl mx-auto">
                <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
                    {/* Course Image */}
                    {course.imageUrl && (
                        <div className="h-64 w-full relative">
                            <img
                                src={course.imageUrl}
                                alt={course.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                        </div>
                    )}

                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-foreground mb-4">{course.title}</h1>

                        <div className="flex flex-wrap gap-6 mb-8 text-muted-foreground">
                            {course.minimumDuration > 0 && (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <span>{Math.round(course.minimumDuration / 60)} ore previste</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span>{course.modules.length} Moduli</span>
                            </div>
                            {course.isRequired && (
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-destructive" />
                                    <span className="text-destructive">Corso Obbligatorio</span>
                                </div>
                            )}
                        </div>

                        <div className="prose prose-invert max-w-none mb-8">
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                {course.description}
                            </p>
                        </div>

                        <div className="border-t border-border pt-8">
                            <h3 className="text-xl font-semibold text-foreground mb-4">Cosa imparerai</h3>
                            <ul className="space-y-3 mb-8">
                                {course.modules.map((module, index) => (
                                    <li key={module.id} className="flex items-start gap-3 text-muted-foreground">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <span>{module.title}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center justify-between bg-accent/50 p-6 rounded-xl border border-border">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Interessato a questo corso?</p>
                                    <p className="text-foreground font-medium">Contatta il tuo responsabile per richiedere l&apos;iscrizione</p>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-sm">Iscrizione gestita da EduPlan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
