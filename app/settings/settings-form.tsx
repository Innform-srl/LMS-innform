"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { User, Mail, Calendar, Shield } from "lucide-react"
import { apiUrl } from "@/lib/api"

interface SettingsFormProps {
    user: {
        id: string
        name: string | null
        email: string
        role: string
        createdAt: Date
    }
}

export function SettingsForm({ user }: SettingsFormProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [name, setName] = useState(user.name || "")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch(apiUrl("/api/user/profile"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            })

            if (res.ok) {
                toast({
                    title: "Profilo aggiornato",
                    description: "Le modifiche sono state salvate con successo."
                })
            } else {
                throw new Error("Failed to update profile")
            }
        } catch {
            toast({
                title: "Errore",
                description: "Impossibile aggiornare il profilo.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast({
                title: "Errore",
                description: "Le password non corrispondono.",
                variant: "destructive"
            })
            return
        }

        if (newPassword.length < 8) {
            toast({
                title: "Errore",
                description: "La password deve essere di almeno 8 caratteri.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch(apiUrl("/api/user/password"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            })

            if (res.ok) {
                toast({
                    title: "Password aggiornata",
                    description: "La tua password è stata cambiata con successo."
                })
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                const data = await res.json()
                throw new Error(data.error || "Failed to change password")
            }
        } catch (error: unknown) {
            toast({
                title: "Errore",
                description: error instanceof Error ? error.message : "Impossibile cambiare la password.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Account Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informazioni Account
                    </CardTitle>
                    <CardDescription>
                        Visualizza e modifica le informazioni del tuo account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Il tuo nome"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Ruolo</Label>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground capitalize">
                                        {user.role === "ADMIN" ? "Amministratore" : user.role === "TEACHER" ? "Docente" : "Utente"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Membro dal</Label>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString("it-IT", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric"
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Salvataggio..." : "Salva Modifiche"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Cambia Password
                    </CardTitle>
                    <CardDescription>
                        Aggiorna la tua password per mantenere il tuo account sicuro
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Password Attuale</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Inserisci la password attuale"
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nuova Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimo 8 caratteri"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Conferma Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Ripeti la nuova password"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={isLoading || !currentPassword || !newPassword}>
                            {isLoading ? "Aggiornamento..." : "Cambia Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
