"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { archiveCourse, restoreCourse, deleteCourse, renameCourse } from "@/app/actions/courses"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Archive, ArchiveRestore, Trash2, MoreVertical, Loader2, Pencil } from "lucide-react"

interface CourseActionsProps {
    courseId: string
    courseTitle: string
    isArchived: boolean
    hasEnrollments: boolean
}

export function CourseActions({ courseId, courseTitle, isArchived, hasEnrollments }: CourseActionsProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showArchiveDialog, setShowArchiveDialog] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [newTitle, setNewTitle] = useState(courseTitle)

    async function handleRename() {
        if (newTitle.trim() === courseTitle) {
            setShowRenameDialog(false)
            return
        }

        setIsLoading(true)
        const result = await renameCourse(courseId, newTitle)

        if (result.success) {
            toast({
                title: "Corso rinominato",
                description: "Il titolo del corso è stato aggiornato.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
        }
        setIsLoading(false)
        setShowRenameDialog(false)
    }

    async function handleArchive() {
        setIsLoading(true)
        const result = await archiveCourse(courseId)

        if (result.success) {
            toast({
                title: "Corso archiviato",
                description: "Il corso è stato archiviato con successo.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
        }
        setIsLoading(false)
        setShowArchiveDialog(false)
    }

    async function handleRestore() {
        setIsLoading(true)
        const result = await restoreCourse(courseId)

        if (result.success) {
            toast({
                title: "Corso ripristinato",
                description: "Il corso è stato ripristinato e si trova nelle Bozze.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
        }
        setIsLoading(false)
    }

    async function handleDelete() {
        setIsLoading(true)
        const result = await deleteCourse(courseId)

        if (result.success) {
            toast({
                title: "Corso eliminato",
                description: "Il corso è stato eliminato definitivamente.",
                className: "bg-green-500 border-green-600 text-white",
            })
            router.refresh()
        } else {
            toast({
                title: "Errore",
                description: result.message,
                variant: "destructive",
            })
        }
        setIsLoading(false)
        setShowDeleteDialog(false)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MoreVertical className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                        setNewTitle(courseTitle)
                        setShowRenameDialog(true)
                    }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rinomina
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isArchived ? (
                        <DropdownMenuItem onClick={handleRestore}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Ripristina
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archivia
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina definitivamente
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Archive Dialog */}
            <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archivia corso</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vuoi archiviare il corso &quot;{courseTitle}&quot;?
                            <br /><br />
                            Il corso verrà rimosso dalla lista pubblica ma tutti i dati (moduli, iscrizioni, progressi) saranno preservati.
                            Potrai ripristinarlo in qualsiasi momento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleArchive}
                            disabled={isLoading}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Archiviazione...
                                </>
                            ) : (
                                <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archivia
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Elimina corso definitivamente</AlertDialogTitle>
                        <AlertDialogDescription>
                            {hasEnrollments ? (
                                <>
                                    <span className="text-red-500 font-semibold">
                                        Questo corso ha iscrizioni attive e non può essere eliminato.
                                    </span>
                                    <br /><br />
                                    Per preservare lo storico dei progressi degli utenti, archivia il corso invece di eliminarlo.
                                </>
                            ) : (
                                <>
                                    Sei sicuro di voler eliminare definitivamente il corso &quot;{courseTitle}&quot;?
                                    <br /><br />
                                    <span className="text-red-500 font-semibold">
                                        Questa azione è irreversibile. Tutti i moduli, quiz e dati associati saranno eliminati permanentemente.
                                    </span>
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
                        {!hasEnrollments && (
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Eliminazione...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Elimina definitivamente
                                    </>
                                )}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename Dialog */}
            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rinomina corso</DialogTitle>
                        <DialogDescription>
                            Inserisci il nuovo titolo per il corso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="newTitle">Titolo</Label>
                        <Input
                            id="newTitle"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Titolo del corso"
                            className="mt-2"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleRename()
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowRenameDialog(false)}
                            disabled={isLoading}
                        >
                            Annulla
                        </Button>
                        <Button
                            onClick={handleRename}
                            disabled={isLoading || !newTitle.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                "Salva"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
