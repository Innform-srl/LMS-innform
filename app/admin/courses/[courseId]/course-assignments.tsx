"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCompanies, getDepartments, searchUsers } from "@/app/actions/organizations"
import { assignCourseToCompany, assignCourseToDepartment, enrollUser, unenrollUser, getCourseEnrollments, getUnenrolledUsers } from "@/app/actions/enrollments"
import { toast } from "sonner"
import { Loader2, Search, Trash2, UserPlus, Users, Building, Briefcase } from "lucide-react"

interface CourseAssignmentsProps {
    courseId: string
    initialCompanyId?: string | null
    initialDepartmentId?: string | null
}

export function CourseAssignments({ courseId, initialCompanyId, initialDepartmentId }: CourseAssignmentsProps) {
    const [companies, setCompanies] = useState<{ id: string, name: string }[]>([])
    const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])
    const [selectedCompany, setSelectedCompany] = useState<string>(initialCompanyId || "")
    const [selectedDepartment, setSelectedDepartment] = useState<string>(initialDepartmentId || "")
    const [isLoading, setIsLoading] = useState(false)

    // Individual Enrollment State
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<{ id: string; name: string | null; email: string; department: { name: string } | null; company: { name: string } | null }[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [enrollments, setEnrollments] = useState<{ id: string; userId: string; createdAt: Date; user: { id: string; name: string | null; email: string; department: { name: string } | null; company: { name: string } | null } }[]>([])
    const [showUnenrolled, setShowUnenrolled] = useState(false)
    const [unenrolledUsers, setUnenrolledUsers] = useState<{ id: string; name: string | null; email: string; department: { name: string } | null; company: { name: string } | null }[]>([])

    const loadData = async () => {
        try {
            const [companiesData, departmentsData, enrollmentsData] = await Promise.all([
                getCompanies(),
                getDepartments(),
                getCourseEnrollments(courseId)
            ])
            setCompanies(Array.isArray(companiesData) ? companiesData : [])
            setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
            setEnrollments(Array.isArray(enrollmentsData) ? enrollmentsData : [])
        } catch (error) {
            console.error("Error loading course data:", error)
        }
    }

    useEffect(() => {
        loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadUnenrolledUsers = async () => {
        setIsLoading(true)
        const users = await getUnenrolledUsers(courseId)
        setUnenrolledUsers(users)
        setIsLoading(false)
    }

    const handleAssignToCompany = async () => {
        if (!selectedCompany) return
        setIsLoading(true)
        const result = await assignCourseToCompany(courseId, selectedCompany)
        setIsLoading(false)
        if (result.success) {
            toast.success(result.message)
            loadData() // Refresh enrollments
        } else {
            toast.error(result.message)
        }
    }

    const handleAssignToDepartment = async () => {
        if (!selectedDepartment) return
        setIsLoading(true)
        const result = await assignCourseToDepartment(courseId, selectedDepartment)
        setIsLoading(false)
        if (result.success) {
            toast.success(result.message)
            loadData() // Refresh enrollments
        } else {
            toast.error(result.message)
        }
    }

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        setShowUnenrolled(false)
        if (query.length < 2) {
            setSearchResults([])
            return
        }
        setIsSearching(true)
        const results = await searchUsers(query)
        setSearchResults(results)
        setIsSearching(false)
    }

    const handleEnrollUser = async (userId: string) => {
        const result = await enrollUser(courseId, userId)
        if (result.success) {
            toast.success(result.message)
            loadData()
            setSearchQuery("")
            setSearchResults([])
            if (showUnenrolled) {
                loadUnenrolledUsers()
            }
        } else {
            toast.error(result.message)
        }
    }

    const handleUnenrollUser = async (userId: string) => {
        if (!confirm("Sei sicuro di voler rimuovere questo utente dal corso?")) return
        const result = await unenrollUser(courseId, userId)
        if (result.success) {
            toast.success(result.message)
            loadData()
            if (showUnenrolled) {
                loadUnenrolledUsers()
            }
        } else {
            toast.error(result.message)
        }
    }

    const toggleUnenrolled = () => {
        if (!showUnenrolled) {
            loadUnenrolledUsers()
        }
        setShowUnenrolled(!showUnenrolled)
        setSearchQuery("")
        setSearchResults([])
    }

    const safeEnrollments = enrollments ?? []

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Assegnazioni Corso
                </CardTitle>
                <CardDescription>Gestisci chi può accedere a questo corso</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="group" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="group">Assegnazione Gruppo</TabsTrigger>
                        <TabsTrigger value="individual">Assegnazione Individuale</TabsTrigger>
                        <TabsTrigger value="list">Utenti Iscritti ({safeEnrollments.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="group" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold">Per Azienda</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">Assegna il corso a tutti i dipendenti di un&apos;azienda.</p>
                                <div className="flex gap-2">
                                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona Azienda" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAssignToCompany} disabled={!selectedCompany || isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assegna"}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold">Per Dipartimento</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">Assegna il corso a tutti i membri di un dipartimento.</p>
                                <div className="flex gap-2">
                                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona Dipartimento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAssignToDepartment} disabled={!selectedDepartment || isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assegna"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="individual" className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cerca utente per nome o email..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button variant={showUnenrolled ? "secondary" : "outline"} onClick={toggleUnenrolled}>
                                {showUnenrolled ? "Nascondi Nuovi Iscritti" : "Mostra Nuovi Iscritti"}
                            </Button>
                        </div>

                        {isSearching && <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {showUnenrolled ? (
                                unenrolledUsers.length === 0 && !isLoading ? (
                                    <div className="text-center text-muted-foreground py-4">Tutti gli utenti sono già iscritti.</div>
                                ) : (
                                    unenrolledUsers.map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {user.company?.name} • {user.department?.name}
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handleEnrollUser(user.id)}>
                                                <UserPlus className="w-4 h-4 mr-2" /> Iscrivi
                                            </Button>
                                        </div>
                                    ))
                                )
                            ) : (
                                searchResults.map(user => {
                                    const isEnrolled = safeEnrollments.some(e => e.userId === user.id)
                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {user.company?.name} • {user.department?.name}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isEnrolled ? "secondary" : "default"}
                                                disabled={isEnrolled}
                                                onClick={() => handleEnrollUser(user.id)}
                                            >
                                                {isEnrolled ? "Già Iscritto" : <><UserPlus className="w-4 h-4 mr-2" /> Iscrivi</>}
                                            </Button>
                                        </div>
                                    )
                                })
                            )}

                            {!showUnenrolled && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                <div className="text-center text-muted-foreground py-4">Nessun utente trovato</div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="list">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {safeEnrollments.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">Nessun utente iscritto a questo corso.</div>
                            ) : (
                                safeEnrollments.map(enrollment => (
                                    <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {enrollment.user.name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <div className="font-medium">{enrollment.user.name}</div>
                                                <div className="text-sm text-muted-foreground">{enrollment.user.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-muted-foreground">
                                                Iscritto il {new Date(enrollment.createdAt).toLocaleDateString()}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleUnenrollUser(enrollment.userId)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
