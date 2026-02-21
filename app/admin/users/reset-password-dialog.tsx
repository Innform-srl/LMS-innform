"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetUserPassword } from "@/app/actions/users"
import { useToast } from "@/components/ui/use-toast"
import { KeyRound, Loader2 } from "lucide-react"

interface ResetPasswordDialogProps {
    userId: string
    userName: string
}

export function ResetPasswordDialog({ userId, userName }: ResetPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const { toast } = useToast()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await resetUserPassword(userId, newPassword)
            if (result.success) {
                toast({
                    title: "Password aggiornata",
                    description: `La password per ${userName} è stata modificata con successo.`,
                    variant: "default",
                })
                setOpen(false)
                setNewPassword("")
            } else {
                toast({
                    title: "Errore",
                    description: result.error || "Errore durante il reset della password",
                    variant: "destructive",
                })
            }
        } catch (_error) {
            toast({
                title: "Errore",
                description: "Si è verificato un errore imprevisto",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Reset Password">
                    <KeyRound className="h-4 w-4 text-orange-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                        Imposta una nuova password per <strong>{userName}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleReset}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-password" className="text-right">
                                Nuova Password
                            </Label>
                            <Input
                                id="new-password"
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="col-span-3"
                                placeholder="Min. 6 caratteri"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salva Nuova Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
