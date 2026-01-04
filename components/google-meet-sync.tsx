"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Video, Upload, Mail, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

interface GoogleMeetSyncProps {
    sessionId: string
    onSync?: () => void
}

export function GoogleMeetSync({ sessionId, onSync }: GoogleMeetSyncProps) {
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [emailList, setEmailList] = useState("")
    const [csvData, setCsvData] = useState("")
    const [result, setResult] = useState<{
        success: boolean
        synced?: number
        notFound?: number
        notFoundEmails?: string[]
        error?: string
    } | null>(null)

    const handleEmailSync = () => {
        startTransition(async () => {
            const emails = emailList
                .split(/[\n,;]/)
                .map(e => e.trim().toLowerCase())
                .filter(e => e.includes("@"))

            const res = await syncGoogleMeetAttendance(sessionId, emails)
            setResult(res)
            if (res.success) {
                onSync?.()
            }
        })
    }

    const handleCsvSync = () => {
        startTransition(async () => {
            const emails: string[] = []
            const lines = csvData.split("\n")
            for (const line of lines) {
                const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
                if (emailMatch) {
                    emails.push(emailMatch[0].toLowerCase())
                }
            }

            const res = await syncGoogleMeetAttendance(sessionId, emails)
            setResult(res)
            if (res.success) {
                onSync?.()
            }
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            setCsvData(event.target?.result as string)
        }
        reader.readAsText(file)
    }

    const resetState = () => {
        setResult(null)
        setEmailList("")
        setCsvData("")
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Video className="w-4 h-4" />
                    Sincronizza Google Meet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-green-500" />
                        Sincronizza Partecipanti Google Meet
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
                                    </p>
                                    {result.notFound && result.notFound > 0 && (
                                        <p className="text-orange-400 text-sm mt-2">
                                            {result.notFound} email non trovate nel sistema
                                        </p>
                                    )}
                                    {result.notFoundEmails && result.notFoundEmails.length > 0 && (
                                        <div className="mt-4 text-left bg-white/5 rounded-lg p-3">
                                            <p className="text-xs text-gray-400 mb-2">Email non trovate:</p>
                                            <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                                                {result.notFoundEmails.map(email => (
                                                    <div key={email}>{email}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={() => setOpen(false)} className="w-full">
                                    Chiudi
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                                <div>
                                    <p className="text-lg font-semibold text-red-400">
                                        Errore durante la sincronizzazione
                                    </p>
                                    <p className="text-gray-400 mt-2">
                                        {result.error}
                                    </p>
                                </div>
                                <Button onClick={resetState} variant="outline" className="w-full">
                                    Riprova
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue="emails" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="emails" className="gap-2">
                                <Mail className="w-4 h-4" />
                                Lista Email
                            </TabsTrigger>
                            <TabsTrigger value="csv" className="gap-2">
                                <Upload className="w-4 h-4" />
                                Import CSV
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="emails" className="space-y-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">
                                    Incolla la lista delle email dei partecipanti (una per riga, separate da virgola o punto e virgola)
                                </p>
                                <Textarea
                                    value={emailList}
                                    onChange={(e) => setEmailList(e.target.value)}
                                    placeholder="mario.rossi@azienda.it&#10;luigi.verdi@azienda.it&#10;anna.bianchi@azienda.it"
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

                        <TabsContent value="csv" className="space-y-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">
                                    Carica il file CSV esportato da Google Admin Console o incolla il contenuto qui sotto
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
