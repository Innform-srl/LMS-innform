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
import { Upload, Search, UserPlus, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ResetPasswordDialog } from "./reset-password-dialog"
import { ApproveUserButton } from "./approve-button"
import { getTranslations } from "next-intl/server"

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const t = await getTranslations("UserManagement")
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const params = await searchParams
    const departmentId = typeof params.department === 'string' ? params.department : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    const where: any = {}
    if (departmentId) where.departmentId = departmentId
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ]
    }

    const [users, departments, pendingUsers] = await Promise.all([
        db.user.findMany({
            where: { ...where, isApproved: true },
            include: {
                department: true,
                enrollments: {
                    select: { timeSpent: true }
                },
                company: true
            },
            orderBy: { createdAt: 'desc' }
        }),
        db.department.findMany({ orderBy: { name: 'asc' } }),
        db.user.findMany({
            where: { isApproved: false },
            orderBy: { createdAt: 'desc' }
        })
    ]) as [any[], any[], any[]]

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
                            {t("addUser")}
                        </Button>
                    </Link>
                    <Link href="/admin/users/import">
                        <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                            <Upload className="w-4 h-4 mr-2" />
                            {t("importCSV")}
                        </Button>
                    </Link>
                    <a href="/api/admin/export/users" download>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <Upload className="w-4 h-4 mr-2 rotate-180" />
                            {t("exportCSV")}
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
                            placeholder={t("searchPlaceholder")}
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
                            <option value="">{t("allDepartments")}</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="ghost" size="sm" className="ml-2">{t("filter")}</Button>
                    </form>
                </div>
            </div>

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-4">{t("pendingUsers")}</h2>
                    <div className="bg-white rounded-lg border border-yellow-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("table.name")}</TableHead>
                                    <TableHead>{t("table.email")}</TableHead>
                                    <TableHead>{t("table.registrationDate")}</TableHead>
                                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
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
                            <TableHead>{t("table.name")}</TableHead>
                            <TableHead>{t("table.email")}</TableHead>
                            <TableHead>{t("table.role")}</TableHead>
                            <TableHead>{t("table.department")}</TableHead>
                            <TableHead>{t("table.company")}</TableHead>
                            <TableHead>{t("table.totalTime")}</TableHead>
                            <TableHead>{t("table.joinDate")}</TableHead>
                            <TableHead className="text-right">{t("table.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    {t("noUsersFound")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user: any) => {
                                const totalSeconds = user.enrollments.reduce((acc: number, curr: { timeSpent: number }) => acc + curr.timeSpent, 0)
                                const hours = Math.floor(totalSeconds / 3600)
                                const minutes = Math.floor((totalSeconds % 3600) / 60)

                                return (
                                    <TableRow key={user.id} className="border-border hover:bg-muted/50">
                                        <TableCell className="font-medium">{user.name || "-"}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>{user.department?.name || "-"}</TableCell>
                                        <TableCell>{user.company?.name || "-"}</TableCell>
                                        <TableCell className="text-orange-400 font-mono text-xs">
                                            {hours}h {minutes}m
                                        </TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ResetPasswordDialog userId={user.id} userName={user.name || user.email} />
                                                <Link href={`/admin/users/${user.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
