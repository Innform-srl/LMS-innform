"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCompanies, getDepartments, searchUsers } from "@/app/actions/organizations";
import {
    getCoursesWithEditions,
    getEditionEnrollmentCount,
    enrollUser,
    assignCourseToCompany,
    assignCourseToDepartment,
} from "@/app/actions/enrollments";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, Plus, Building, Briefcase, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseWithEditions {
    id: string;
    title: string;
    editions: {
        id: string;
        code: string;
        title: string;
        status: string;
        maxParticipants: number;
        _count: { enrollments: number };
    }[];
}

export function NewEnrollmentDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [courses, setCourses] = useState<CourseWithEditions[]>([]);
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Selection state
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [selectedEditionId, setSelectedEditionId] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<
        {
            id: string;
            name: string | null;
            email: string;
            department: { name: string } | null;
            company: { name: string } | null;
        }[]
    >([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    // Capacity warning
    const [capacityInfo, setCapacityInfo] = useState<{ current: number; max: number } | null>(null);

    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const availableEditions = selectedCourse?.editions || [];
    const selectedEdition = availableEditions.find((e) => e.id === selectedEditionId);
    const overCapacity = capacityInfo && selectedEdition && capacityInfo.current >= capacityInfo.max;

    const loadDialogData = async () => {
        setIsLoadingData(true);
        const [c, co, d] = await Promise.all([
            getCoursesWithEditions().catch(() => []),
            getCompanies().catch(() => []),
            getDepartments().catch(() => []),
        ]);
        setCourses(Array.isArray(c) ? c : []);
        setCompanies(Array.isArray(co) ? co : []);
        setDepartments(Array.isArray(d) ? d : []);
        setIsLoadingData(false);
    };

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void loadDialogData();
        }
    }, [open]);

    const loadCapacity = async (eid: string) => {
        if (eid) {
            const info = await getEditionEnrollmentCount(eid);
            setCapacityInfo(info);
        } else {
            setCapacityInfo(null);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadCapacity(selectedEditionId);
    }, [selectedEditionId]);

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedEditionId("");
        setCapacityInfo(null);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchUsers(query);
            setSearchResults(Array.isArray(results) ? results : []);
        } catch {
            setSearchResults([]);
        }
        setIsSearching(false);
    };

    const handleEnrollUser = async (userId: string) => {
        if (!selectedCourseId) return;
        setIsEnrolling(true);
        const result = await enrollUser(selectedCourseId, userId, selectedEditionId || undefined);
        setIsEnrolling(false);
        if (result.success) {
            toast.success(result.message);
            router.refresh();
            // Update capacity
            if (selectedEditionId) {
                getEditionEnrollmentCount(selectedEditionId).then(setCapacityInfo);
            }
        } else {
            toast.error(result.message);
        }
    };

    const handleAssignToCompany = async () => {
        if (!selectedCourseId || !selectedCompany) return;
        setIsEnrolling(true);
        const result = await assignCourseToCompany(selectedCourseId, selectedCompany, selectedEditionId || undefined);
        setIsEnrolling(false);
        if (result.success) {
            toast.success(result.message);
            router.refresh();
            if (selectedEditionId) {
                getEditionEnrollmentCount(selectedEditionId).then(setCapacityInfo);
            }
        } else {
            toast.error(result.message);
        }
    };

    const handleAssignToDepartment = async () => {
        if (!selectedCourseId || !selectedDepartment) return;
        setIsEnrolling(true);
        const result = await assignCourseToDepartment(
            selectedCourseId,
            selectedDepartment,
            selectedEditionId || undefined
        );
        setIsEnrolling(false);
        if (result.success) {
            toast.success(result.message);
            router.refresh();
            if (selectedEditionId) {
                getEditionEnrollmentCount(selectedEditionId).then(setCapacityInfo);
            }
        } else {
            toast.error(result.message);
        }
    };

    const resetState = () => {
        setSelectedCourseId("");
        setSelectedEditionId("");
        setSelectedCompany("");
        setSelectedDepartment("");
        setSearchQuery("");
        setSearchResults([]);
        setCapacityInfo(null);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Iscrizione
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuova Iscrizione</DialogTitle>
                </DialogHeader>

                {isLoadingData ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Step 1: Select Course */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Corso</label>
                            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un corso..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Step 2: Select Edition (if available) */}
                        {selectedCourseId && availableEditions.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Edizione (opzionale)</label>
                                <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona edizione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Nessuna edizione</SelectItem>
                                        {availableEditions.map((ed) => (
                                            <SelectItem key={ed.id} value={ed.id}>
                                                {ed.title} ({ed.code}) — {ed._count.enrollments}/{ed.maxParticipants}{" "}
                                                iscritti
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Capacity warning */}
                        {overCapacity && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 text-sm">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>
                                    Attenzione: l&apos;edizione ha raggiunto la capienza massima ({capacityInfo.current}
                                    /{capacityInfo.max}).
                                </span>
                            </div>
                        )}

                        {/* Step 3: Enroll users */}
                        {selectedCourseId && (
                            <Tabs defaultValue="individual" className="space-y-4">
                                <TabsList>
                                    <TabsTrigger value="individual">Individuale</TabsTrigger>
                                    <TabsTrigger value="group">Gruppo</TabsTrigger>
                                </TabsList>

                                <TabsContent value="individual" className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Cerca utente per nome o email..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    {isSearching && (
                                        <div className="text-center py-4">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </div>
                                    )}

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {searchResults.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                                            >
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {user.company?.name}{" "}
                                                        {user.department?.name && `• ${user.department.name}`}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={isEnrolling}
                                                    onClick={() => handleEnrollUser(user.id)}
                                                >
                                                    {isEnrolling ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-4 h-4 mr-2" /> Iscrivi
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ))}

                                        {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                            <div className="text-center text-muted-foreground py-4">
                                                Nessun utente trovato
                                            </div>
                                        )}

                                        {searchQuery.length < 2 && (
                                            <div className="text-center text-muted-foreground py-4 text-sm">
                                                Digita almeno 2 caratteri per cercare...
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="group" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-primary" />
                                                <h3 className="font-semibold text-sm">Per Azienda</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleziona Azienda" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {companies.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    onClick={handleAssignToCompany}
                                                    disabled={!selectedCompany || isEnrolling}
                                                >
                                                    {isEnrolling ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Iscrivi"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-primary" />
                                                <h3 className="font-semibold text-sm">Per Dipartimento</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={selectedDepartment}
                                                    onValueChange={setSelectedDepartment}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleziona Dipartimento" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {departments.map((d) => (
                                                            <SelectItem key={d.id} value={d.id}>
                                                                {d.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    onClick={handleAssignToDepartment}
                                                    disabled={!selectedDepartment || isEnrolling}
                                                >
                                                    {isEnrolling ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Iscrivi"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
