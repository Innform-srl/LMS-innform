"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

interface DeleteUserButtonProps {
  userId: string
  userName: string
  userEmail: string
}

export function DeleteUserButton({ userId, userName, userEmail }: DeleteUserButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const [showForceOption, setShowForceOption] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const handleDelete = async (force: boolean = false) => {
    setIsDeleting(true)
    setErrorMessage("")
    try {
      const url = force
        ? `/lms/api/admin/users/${userId}?force=true`
        : `/lms/api/admin/users/${userId}`

      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.canForceDelete) {
          setShowForceOption(true)
          setErrorMessage(data.error)
          return
        }
        throw new Error(data.error || "Errore durante l'eliminazione")
      }

      setOpen(false)
      setShowForceOption(false)
      router.refresh()
    } catch (error) {
      console.error("Errore eliminazione utente:", error)
      setErrorMessage(error instanceof Error ? error.message : "Errore durante l'eliminazione")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setShowForceOption(false)
      setErrorMessage("")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {showForceOption ? "Forzare eliminazione?" : "Eliminare questo utente?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {showForceOption ? (
                <>
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-yellow-800 text-sm">
                      {errorMessage}
                    </div>
                  </div>
                  <p className="mb-2">
                    Se l&apos;iscrizione su EduPlan non esiste più (utente già rimosso da EduPlan),
                    puoi forzare l&apos;eliminazione per rimuovere i dati orfani.
                  </p>
                  <p className="text-red-600 font-medium">
                    Questa azione eliminerà definitivamente l&apos;utente e tutte le sue iscrizioni.
                  </p>
                </>
              ) : (
                <>
                  Stai per eliminare <strong>{userName}</strong> ({userEmail}).
                  <br /><br />
                  Questa azione eliminerà permanentemente:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>L&apos;account utente</li>
                    <li>Tutte le iscrizioni ai corsi</li>
                    <li>Il progresso e i dati di apprendimento</li>
                    <li>I certificati ottenuti</li>
                  </ul>
                  <br />
                  <strong className="text-red-600">Questa azione non può essere annullata.</strong>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          {showForceOption ? (
            <Button
              onClick={() => handleDelete(true)}
              disabled={isDeleting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Forza Eliminazione
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina Utente
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
