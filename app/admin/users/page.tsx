import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { Upload, Search, UserPlus, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ResetPasswordDialog } from "./reset-password-dialog"
import { ApproveUserButton } from "./approve-button"
import { DeleteUserButton } from "./delete-user-button"
import { formatDateOnly } from "@/lib/utils"

const PAGE_SIZE = 20

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const params = await searchParams
    const departmentId = typeof params.department === 'string' ? params.department : undefined
    const search = typeof params.search === 'string' ? params.search : undefined
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page)) : 1

    const where: { departmentId?: string; OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }> } = {}
    if (departmentId) where.departmentId = departmentId
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ]
    }

    const [users, totalCount, departments, pendingUsers] = await Promise.all([
        db.user.findMany({
            where: { ...where, isApproved: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                department: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } },
                _count: { select: { enrollments: true } },
                enrollments: { select: { timeSpent: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE
        }),
        db.user.count({ where: { ...where, isApproved: true } }),
        db.department.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        db.user.findMany({
            where: { isApproved: false },
            select: { id: true, name: true, email: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10 // Limit pending users shown
        })
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    // Build pagination URL params
    const buildPageUrl = (pageNum: number) => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (departmentId) params.set('department', departmentId)
        params.set('page', pageNum.toString())
        return `?${params.toString()}`
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex-1">
                    {/* Search and Filter moved here or kept below */}
                </div>
                <div className="flex gap-3">
                    <Link href="/admin/users/create">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Aggiungi Utente
                        </Button>
                    </Link>
                    <Link href="/admin/users/import">
                        <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                            <Upload className="w-4 h-4 mr-2" />
                            Importa CSV
                        </Button>
                    </Link>
                    <a href="/lms/api/admin/export/users" download>
                        <Button className="bg-success hover:bg-success/90 text-white">
                            <Upload className="w-4 h-4 mr-2 rotate-180" />
                            Esporta CSV
                        </Button>
                    </a>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="flex-1">
                    <form className="flex gap-2">
                        <Input
                            name="search"
                            placeholder="Cerca per nome o email..."
                            defaultValue={search}
                            className="bg-background border-border"
                        />
                        {departmentId && <input type="hidden" name="department" value={departmentId} />}
                        <Button type="submit" variant="secondary">
                            <Search className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
                <div className="w-64">
                    <form>
                        {search && <input type="hidden" name="search" value={search} />}
                        <select
                            name="department"
                            className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            defaultValue={departmentId || ""}
                        // Simple onchange submit for now, ideally use a client component
                        >
                            <option value="">Tutti i Dipartimenti</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="ghost" size="sm" className="ml-2">Filtra</Button>
                    </form>
                </div>
            </div>

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-4">Utenti in Attesa di Approvazione</h2>
                    <div className="bg-white rounded-lg border border-yellow-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Data Registrazione</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.map((user: { id: string; name: string | null; email: string; createdAt: Date }) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{formatDateOnly(new Date(user.createdAt))}</TableCell>
                                        <TableCell className="text-right">
                                            <ApproveUserButton userId={user.id} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Ruolo</TableHead>
                            <TableHead>Dipartimento</TableHead>
                            <TableHead>Azienda</TableHead>
                            <TableHead>Tempo Totale</TableHead>
                            <TableHead>Data Iscrizione</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Nessun utente trovato
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user: { id: string; name: string | null; email: string; role: string; createdAt: Date; department: { id: string; name: string } | null; company: { id: string; name: string } | null; _count: { enrollments: number }; enrollments: { timeSpent: number }[] }) => {
                                const totalSeconds = user.enrollments.reduce((acc: number, curr: { timeSpent: number }) => acc + curr.timeSpent, 0)
                                const hours = Math.floor(totalSeconds / 3600)
                                const minutes = Math.floor((totalSeconds % 3600) / 60)

                                return (
                                    <TableRow key={user.id} className="border-border hover:bg-muted/50">
                                        <TableCell className="font-medium">{user.name || "-"}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-primary/10 text-primary border border-primary/20' : user.role === 'TEACHER' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                {user.role === 'TEACHER' ? 'DOCENTE' : user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>{user.department?.name || "-"}</TableCell>
                                        <TableCell>{user.company?.name || "-"}</TableCell>
                                        <TableCell className="text-orange-400 font-mono text-xs">
                                            {hours}h {minutes}m
                                        </TableCell>
                                        <TableCell>{formatDateOnly(new Date(user.createdAt))}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ResetPasswordDialog userId={user.id} userName={user.name || user.email} />
                                                <Link href={`/admin/users/${user.id}`} prefetch={false}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <DeleteUserButton
                                                    userId={user.id}
                                                    userName={user.name || "Utente"}
                                                    userEmail={user.email}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)} di {totalCount} utenti
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={buildPageUrl(page - 1)} aria-disabled={page <= 1}>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                className="border-border"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Precedente
                            </Button>
                        </Link>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (page <= 3) {
                                    pageNum = i + 1
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = page - 2 + i
                                }
                                return (
                                    <Link key={pageNum} href={buildPageUrl(pageNum)}>
                                        <Button
                                            variant={page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            className={page === pageNum ? "bg-primary" : "border-border"}
                                        >
                                            {pageNum}
                                        </Button>
                                    </Link>
                                )
                            })}
                        </div>
                        <Link href={buildPageUrl(page + 1)} aria-disabled={page >= totalPages}>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                className="border-border"
                            >
                                Successivo
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
