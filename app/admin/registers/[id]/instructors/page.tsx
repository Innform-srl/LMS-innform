import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRegister, getTeachersForRegister } from "@/app/actions/registers"
import { InstructorsManager } from "./instructors-manager"

export default async function InstructorsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const { id } = await params
    const [register, teacherUsers] = await Promise.all([
        getRegister(id),
        getTeachersForRegister(id),
    ])
    if (!register) notFound()

    const isEditable = register.status !== "CLOSED" && register.status !== "ARCHIVED"

    // Calculate hours per instructor from entries
    const instructorHoursMap = new Map<string, { classroomHours: number; entriesCount: number }>()
    for (const entry of register.entries) {
        for (const ie of entry.instructorEntries) {
            const current = instructorHoursMap.get(ie.instructor.name) || { classroomHours: 0, entriesCount: 0 }
            current.classroomHours += ie.hoursDelivered ?? 0
            current.entriesCount += 1
            instructorHoursMap.set(ie.instructor.name, current)
        }
    }

    const totalInstructorHours = register.instructors.reduce((sum, i) => sum + i.totalHours, 0)

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-1 text-sm">
                    <Link href="/admin/registers" className="text-muted-foreground hover:text-foreground">
                        Registri
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <Link href={`/admin/registers/${id}`} className="text-muted-foreground hover:text-foreground">
                        {register.title}
                    </Link>
                    <span className="text-muted-foreground">/</span>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Gestione Docenti e Tutor</h1>
                    <p className="text-muted-foreground mt-1">
                        {register.instructors.length} docenti - {Math.round(totalInstructorHours * 10) / 10}h totali erogate
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">{register.instructors.length}</p>
                            <p className="text-xs text-muted-foreground">Docenti/Tutor</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">{Math.round(totalInstructorHours * 10) / 10}h</p>
                            <p className="text-xs text-muted-foreground">Ore Totali Erogate</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">{register.entries.length}</p>
                            <p className="text-xs text-muted-foreground">Giornate Formative</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Report per Docente */}
                {register.instructors.length > 0 && (
                    <Card className="bg-card border-border mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg">Riepilogo Ore per Docente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="text-left py-2 px-2 font-medium">Docente</th>
                                            <th className="text-left py-2 px-2 font-medium">Ruolo</th>
                                            <th className="text-left py-2 px-2 font-medium">Specializzazione</th>
                                            <th className="text-right py-2 px-2 font-medium">Giornate</th>
                                            <th className="text-right py-2 px-2 font-medium">Ore Erogate</th>
                                            <th className="text-center py-2 px-2 font-medium">% sul Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {register.instructors.map((inst) => {
                                            const details = instructorHoursMap.get(inst.name) || { classroomHours: 0, entriesCount: 0 }
                                            const pctOfTotal = totalInstructorHours > 0
                                                ? Math.round((inst.totalHours / totalInstructorHours) * 100)
                                                : 0
                                            return (
                                                <tr key={inst.id} className="border-b border-border/50 hover:bg-accent/30">
                                                    <td className="py-2 px-2">
                                                        <p className="font-medium text-foreground">{inst.name}</p>
                                                        {inst.email && <p className="text-xs text-muted-foreground">{inst.email}</p>}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
                                                            {inst.role === "DOCENTE" ? "Docente" : inst.role === "TUTOR" ? "Tutor" : inst.role === "CODOCENTE" ? "Co-docente" : "Esperto"}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2 text-muted-foreground text-xs">{inst.specialization || "-"}</td>
                                                    <td className="py-2 px-2 text-right">{details.entriesCount}</td>
                                                    <td className="py-2 px-2 text-right font-medium">{inst.totalHours}h</td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex items-center gap-2 justify-center">
                                                            <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full"
                                                                    style={{ width: `${pctOfTotal}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground w-8">{pctOfTotal}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <InstructorsManager register={register} isEditable={isEditable} teacherUsers={teacherUsers} />
            </div>
        </div>
    )
}
