"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { syncGoogleMeetAttendance } from "@/app/actions/attendance"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Video, Upload, Mail, RefreshCw, CheckCircle, AlertCircle, Zap, ExternalLink, User, Clock, UserPlus, Check } from "lucide-react"
import { formatTime as formatTimeUtil } from "@/lib/utils"

interface GoogleMeetSyncProps {
    sessionId: string
    googleMeetCode?: string | null
    onSync?: () => void
}

interface UnmatchedParticipant {
    displayName: string
    checkInTime: string
    checkOutTime: string | null
    durationMinutes: number
    sessionCount: number
    sessions: Array<{ startTime: string; endTime: string | null; durationMinutes: number }>
    participantType: "google" | "anonymous" | "phone"
}

interface SyncResult {
    success: boolean
    synced?: number
    notFound?: number
    notFoundEmails?: string[]
    unmatchedParticipants?: UnmatchedParticipant[]
    error?: string
    requiresAuth?: boolean
    authUrl?: string
    method?: string
    totalFromMeet?: number
}

interface LmsUser {
    id: string
    name: string | null
    email: string
}

interface ConnectionStatus {
    connected: boolean
    authUrl: string
}

export function GoogleMeetSync({ sessionId, googleMeetCode, onSync }: GoogleMeetSyncProps) {
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [emailList, setEmailList] = useState("")
    const [csvData, setCsvData] = useState("")
    const [result, setResult] = useState<SyncResult | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
    const [isLoadingStatus, setIsLoadingStatus] = useState(false)
    const [allUsers, setAllUsers] = useState<LmsUser[]>([])
    const [associations, setAssociations] = useState<Record<number, string>>({})
    const [associating, setAssociating] = useState<number | null>(null)
    const [associatedIndexes, setAssociatedIndexes] = useState<Set<number>>(new Set())

    // Carica lo stato della connessione Google Meet quando si apre il dialog
    useEffect(() => {
        if (open) {
            loadConnectionStatus()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const loadConnectionStatus = async () => {
        setIsLoadingStatus(true)
        try {
            const res = await fetch(`/lms/api/integrations/google-meet?sessionId=${sessionId}`)
            if (!res.ok) {
                console.error("Failed to load connection status:", res.status)
                setConnectionStatus({ connected: false, authUrl: "" })
                return
            }
            const data = await res.json()
            setConnectionStatus({
                connected: data.googleMeetConnected,
                authUrl: data.authUrl
            })
        } catch (err) {
            console.error("Failed to load connection status:", err)
            setConnectionStatus({ connected: false, authUrl: "" })
        } finally {
            setIsLoadingStatus(false)
        }
    }

    const loadUsers = async () => {
        try {
            const res = await fetch("/lms/api/integrations/google-meet?action=users")
            if (res.ok) {
                const data = await res.json()
                setAllUsers(data.users || [])
            }
        } catch (err) {
            console.error("Failed to load users:", err)
        }
    }

    const handleAssociate = async (index: number, participant: UnmatchedParticipant) => {
        const userId = associations[index]
        if (!userId) return

        setAssociating(index)
        try {
            const res = await fetch("/lms/api/integrations/google-meet", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    userId,
                    displayName: participant.displayName,
                    checkInTime: participant.checkInTime,
                    checkOutTime: participant.checkOutTime,
                    durationMinutes: participant.durationMinutes,
                    sessionCount: participant.sessionCount,
                    sessions: participant.sessions,
                    participantType: participant.participantType
                })
            })
            const data = await res.json()
            if (data.success) {
                setAssociatedIndexes(prev => new Set([...prev, index]))
                onSync?.()
            }
        } catch (err) {
            console.error("Association failed:", err)
        } finally {
            setAssociating(null)
        }
    }

    // ── AUTO SYNC (Google Meet API) ────────────────────────────────────────
    const handleAutoSync = () => {
        startTransition(async () => {
            try {
                const res = await fetch("/lms/api/integrations/google-meet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, method: "auto" })
                })
                const data = await res.json()

                if (data.requiresAuth && data.authUrl) {
                    // Redirect per autenticazione OAuth
                    window.location.href = data.authUrl
                    return
                }

                setResult(data)
                if (data.success) {
                    onSync?.()
                    if (data.unmatchedParticipants?.length) {
                        loadUsers()
                    }
                }
            } catch (err) {
                console.error("Auto sync failed:", err)
                setResult({ success: false, error: "Errore di connessione al server. Riprova più tardi." })
            }
        })
    }

    // ── EMAIL SYNC (manuale) ───────────────────────────────────────────────
    const handleEmailSync = () => {
        startTransition(async () => {
            try {
                const emails = emailList
                    .split(/[\n,;]/)
                    .map(e => e.trim().toLowerCase())
                    .filter(e => e.includes("@"))

                const res = await syncGoogleMeetAttendance(sessionId, emails)
                setResult(res)
                if (res.success) onSync?.()
            } catch (err) {
                console.error("Email sync failed:", err)
                setResult({ success: false, error: "Errore di connessione al server. Riprova più tardi." })
            }
        })
    }

    // ── CSV SYNC ───────────────────────────────────────────────────────────
    const handleCsvSync = () => {
        startTransition(async () => {
            try {
                const emails: string[] = []
                const lines = csvData.split("\n")
                for (const line of lines) {
                    const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
                    if (emailMatch) emails.push(emailMatch[0].toLowerCase())
                }

                const res = await syncGoogleMeetAttendance(sessionId, emails)
                setResult(res)
                if (res.success) onSync?.()
            } catch (err) {
                console.error("CSV sync failed:", err)
                setResult({ success: false, error: "Errore di connessione al server. Riprova più tardi." })
            }
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => setCsvData(event.target?.result as string)
        reader.readAsText(file)
    }

    const resetState = () => {
        setResult(null)
        setEmailList("")
        setCsvData("")
        setAssociations({})
        setAssociatedIndexes(new Set())
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Video className="w-4 h-4" />
                    Sincronizza Google Meet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-green-500" />
                        Sincronizza Partecipanti Google Meet
                        {connectionStatus && (
                            <Badge
                                variant={connectionStatus.connected ? "default" : "secondary"}
                                className={connectionStatus.connected ? "bg-green-600 text-white" : ""}
                            >
                                {connectionStatus.connected ? "Connesso" : "Non connesso"}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Importa i partecipanti da Google Meet per aggiornare le presenze automaticamente.
                    </DialogDescription>
                </DialogHeader>

                {result ? (
                    <div className="py-6">
                        {result.success ? (
                            <div className="text-center space-y-4">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                                <div>
                                    <p className="text-lg font-semibold text-green-400">
                                        Sincronizzazione completata!
                                    </p>
                                    <p className="text-gray-400 mt-2">
                                        {result.synced} partecipanti sincronizzati
                                        {result.method === "auto" && " con orari reali da Google Meet"}
                                    </p>
                                    {result.notFound != null && result.notFound > 0 && (
                                        <p className="text-orange-400 text-sm mt-2">
                                            {result.notFound} email non trovate nel sistema
                                        </p>
                                    )}
                                    {result.notFoundEmails && result.notFoundEmails.length > 0 && !result.unmatchedParticipants?.length && (
                                        <div className="mt-4 text-left bg-muted rounded-lg p-3">
                                            <p className="text-xs text-gray-400 mb-2">Email non trovate:</p>
                                            <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                                                {result.notFoundEmails.map(email => (
                                                    <div key={email}>{email}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {result.unmatchedParticipants && result.unmatchedParticipants.length > 0 && (
                                        <div className="mt-4 text-left space-y-3">
                                            <p className="text-sm font-medium text-orange-400 flex items-center gap-1.5">
                                                <User className="w-4 h-4" />
                                                {result.unmatchedParticipants.length} partecipant{result.unmatchedParticipants.length === 1 ? "e" : "i"} non riconosciut{result.unmatchedParticipants.length === 1 ? "o" : "i"}
                                            </p>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {result.unmatchedParticipants.map((p, idx) => (
                                                    <div key={idx} className="bg-muted rounded-lg p-3 border border-orange-500/20">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-medium text-foreground text-sm">{p.displayName}</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {p.durationMinutes} min
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mb-2">
                                                            {formatTimeUtil(new Date(p.checkInTime))}
                                                            {p.checkOutTime && ` – ${formatTimeUtil(new Date(p.checkOutTime))}`}
                                                            {p.sessionCount > 1 && ` (${p.sessionCount} connessioni)`}
                                                        </div>
                                                        {associatedIndexes.has(idx) ? (
                                                            <div className="flex items-center gap-1.5 text-green-500 text-xs">
                                                                <Check className="w-3.5 h-3.5" />
                                                                Associato con successo
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <Select
                                                                    value={associations[idx] || ""}
                                                                    onValueChange={(val) => setAssociations(prev => ({ ...prev, [idx]: val }))}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs flex-1">
                                                                        <SelectValue placeholder="Associa a un utente..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {allUsers.map(u => (
                                                                            <SelectItem key={u.id} value={u.id} className="text-xs">
                                                                                {u.name || u.email} {u.name ? `(${u.email})` : ""}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 px-2"
                                                                    disabled={!associations[idx] || associating === idx}
                                                                    onClick={() => handleAssociate(idx, p)}
                                                                >
                                                                    {associating === idx ? (
                                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <UserPlus className="w-3.5 h-3.5" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {result.totalFromMeet != null && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Totale partecipanti trovati da Google Meet: {result.totalFromMeet}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={resetState} variant="outline" className="flex-1">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Risincronizza
                                    </Button>
                                    <Button onClick={() => setOpen(false)} className="flex-1">Chiudi</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                                <div>
                                    <p className="text-lg font-semibold text-red-400">
                                        Errore durante la sincronizzazione
                                    </p>
                                    <p className="text-gray-400 mt-2">{result.error}</p>
                                </div>
                                <Button onClick={resetState} variant="outline" className="w-full">Riprova</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue={googleMeetCode ? "auto" : "emails"} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="auto" className="gap-1 text-xs">
                                <Zap className="w-3 h-3" />
                                Auto
                            </TabsTrigger>
                            <TabsTrigger value="emails" className="gap-1 text-xs">
                                <Mail className="w-3 h-3" />
                                Email
                            </TabsTrigger>
                            <TabsTrigger value="csv" className="gap-1 text-xs">
                                <Upload className="w-3 h-3" />
                                CSV
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB AUTO SYNC */}
                        <TabsContent value="auto" className="space-y-4 mt-4">
                            {isLoadingStatus ? (
                                <div className="text-center py-4 text-gray-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    Verifica connessione...
                                </div>
                            ) : connectionStatus?.connected ? (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                        <p className="text-sm text-green-400 font-medium">✓ Google Meet connesso</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Il sistema recupererà automaticamente i partecipanti con orari reali di ingresso e uscita.
                                        </p>
                                    </div>
                                    {!googleMeetCode && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                            <p className="text-sm text-orange-400">
                                                ⚠ Nessun codice Google Meet associato a questa sessione.
                                                Aggiungilo nelle impostazioni della sessione.
                                            </p>
                                        </div>
                                    )}
                                    {googleMeetCode && (
                                        <div className="bg-muted rounded-lg p-3">
                                            <p className="text-xs text-gray-400">Codice Meet:</p>
                                            <p className="text-sm font-mono text-white">{googleMeetCode}</p>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleAutoSync}
                                        disabled={isPending || !googleMeetCode}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        {isPending ? (
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Zap className="w-4 h-4 mr-2" />
                                        )}
                                        Sincronizza da Google Meet
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-muted border border-border rounded-lg p-4 text-center">
                                        <Video className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-white mb-1">
                                            Connetti Google Meet
                                        </p>
                                        <p className="text-xs text-gray-400 mb-4">
                                            Autorizza l&apos;accesso per sincronizzare automaticamente i partecipanti
                                            con orari reali di ingresso e uscita.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                if (connectionStatus?.authUrl) {
                                                    window.location.href = connectionStatus.authUrl
                                                } else {
                                                    setResult({ success: false, error: "URL di autenticazione non disponibile. Verifica la configurazione Google Meet nelle impostazioni." })
                                                }
                                            }}
                                            className="w-full gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Connetti con Google
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB EMAIL */}
                        <TabsContent value="emails" className="space-y-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">
                                    Incolla la lista delle email dei partecipanti (una per riga, separate da virgola o punto e virgola)
                                </p>
                                <Textarea
                                    value={emailList}
                                    onChange={(e) => setEmailList(e.target.value)}
                                    placeholder="mario.rossi@azienda.it&#10;luigi.verdi@azienda.it"
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <Button
                                onClick={handleEmailSync}
                                disabled={isPending || !emailList.trim()}
                                className="w-full"
                            >
                                {isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Sincronizza
                            </Button>
                        </TabsContent>

                        {/* TAB CSV */}
                        <TabsContent value="csv" className="space-y-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">
                                    Carica il file CSV esportato da Google Admin Console
                                </p>
                                <Input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="mb-4"
                                />
                                <Textarea
                                    value={csvData}
                                    onChange={(e) => setCsvData(e.target.value)}
                                    placeholder="Incolla qui il contenuto CSV..."
                                    rows={6}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <Button
                                onClick={handleCsvSync}
                                disabled={isPending || !csvData.trim()}
                                className="w-full"
                            >
                                {isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Importa e Sincronizza
                            </Button>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    )
}
