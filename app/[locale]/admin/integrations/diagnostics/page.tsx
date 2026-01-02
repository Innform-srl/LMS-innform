"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Send,
    ArrowLeft,
    Clock,
    Database,
    Globe,
    Shield
} from "lucide-react"

type TestResult = {
    name: string
    status: 'pending' | 'running' | 'success' | 'error' | 'warning'
    message: string
    duration?: number
    details?: string
}

export default function WebhookDiagnosticsPage() {
    const [tests, setTests] = useState<TestResult[]>([
        { name: 'Configurazione Variabili Ambiente', status: 'pending', message: 'Non testato' },
        { name: 'Connessione Database', status: 'pending', message: 'Non testato' },
        { name: 'Tabella WebhookEvent', status: 'pending', message: 'Non testato' },
        { name: 'Endpoint Webhook TMS', status: 'pending', message: 'Non testato' },
        { name: 'Validazione Firma HMAC', status: 'pending', message: 'Non testato' },
        { name: 'Cron Job TMS Sync', status: 'pending', message: 'Non testato' },
    ])
    const [isRunning, setIsRunning] = useState(false)
    const [testWebhookUrl, setTestWebhookUrl] = useState('')
    const [manualTestResult, setManualTestResult] = useState<string | null>(null)

    const updateTest = (index: number, update: Partial<TestResult>) => {
        setTests(prev => prev.map((t, i) => i === index ? { ...t, ...update } : t))
    }

    const runDiagnostics = async () => {
        setIsRunning(true)

        // Reset all tests
        setTests(prev => prev.map(t => ({ ...t, status: 'pending' as const, message: 'In attesa...' })))

        // Test 1: Environment Variables
        updateTest(0, { status: 'running', message: 'Verifica in corso...' })
        await new Promise(r => setTimeout(r, 500))
        try {
            const res = await fetch('/api/admin/diagnostics/env-check')
            const data = await res.json()
            updateTest(0, {
                status: data.allSet ? 'success' : 'warning',
                message: data.allSet ? 'Tutte le variabili configurate' : `${data.missing?.length || 0} variabili mancanti`,
                details: data.missing?.join(', ')
            })
        } catch {
            updateTest(0, { status: 'error', message: 'Errore verifica variabili' })
        }

        // Test 2: Database Connection
        updateTest(1, { status: 'running', message: 'Connessione in corso...' })
        const dbStart = Date.now()
        try {
            const res = await fetch('/api/admin/diagnostics/db-check')
            const data = await res.json()
            updateTest(1, {
                status: data.connected ? 'success' : 'error',
                message: data.connected ? 'Connessione OK' : 'Connessione fallita',
                duration: Date.now() - dbStart
            })
        } catch {
            updateTest(1, { status: 'error', message: 'Errore connessione database', duration: Date.now() - dbStart })
        }

        // Test 3: WebhookEvent Table
        updateTest(2, { status: 'running', message: 'Verifica tabella...' })
        try {
            const res = await fetch('/api/admin/diagnostics/webhook-table-check')
            const data = await res.json()
            updateTest(2, {
                status: data.exists ? 'success' : 'error',
                message: data.exists ? `Tabella OK (${data.count} eventi)` : 'Tabella non trovata',
                details: data.exists ? `Ultimi 24h: ${data.recentCount} eventi` : undefined
            })
        } catch {
            updateTest(2, { status: 'error', message: 'Errore verifica tabella' })
        }

        // Test 4: Webhook Endpoint
        updateTest(3, { status: 'running', message: 'Test endpoint...' })
        const webhookStart = Date.now()
        try {
            const res = await fetch('/api/webhooks/tms', { method: 'OPTIONS' })
            updateTest(3, {
                status: res.status !== 404 ? 'success' : 'error',
                message: res.status !== 404 ? 'Endpoint disponibile' : 'Endpoint non trovato',
                duration: Date.now() - webhookStart
            })
        } catch {
            updateTest(3, { status: 'error', message: 'Endpoint non raggiungibile', duration: Date.now() - webhookStart })
        }

        // Test 5: HMAC Validation
        updateTest(4, { status: 'running', message: 'Test firma...' })
        try {
            const res = await fetch('/api/webhooks/tms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-TMS-Signature': 'invalid-test-signature',
                    'X-TMS-Timestamp': Date.now().toString()
                },
                body: JSON.stringify({ event_type: 'test', data: {} })
            })
            updateTest(4, {
                status: res.status === 401 || res.status === 403 ? 'success' : 'warning',
                message: res.status === 401 || res.status === 403
                    ? 'Firma invalida correttamente rifiutata'
                    : `Risposta inattesa: ${res.status}`
            })
        } catch {
            updateTest(4, { status: 'error', message: 'Errore test firma' })
        }

        // Test 6: Cron Job
        updateTest(5, { status: 'running', message: 'Verifica cron...' })
        try {
            const res = await fetch('/api/admin/diagnostics/cron-check')
            const data = await res.json()
            updateTest(5, {
                status: data.configured ? 'success' : 'warning',
                message: data.configured ? 'Cron configurato' : 'Cron non configurato',
                details: data.lastRun ? `Ultimo run: ${new Date(data.lastRun).toLocaleString('it-IT')}` : undefined
            })
        } catch {
            updateTest(5, { status: 'warning', message: 'Impossibile verificare cron' })
        }

        setIsRunning(false)
    }

    const sendTestWebhook = async () => {
        if (!testWebhookUrl) {
            setManualTestResult('Inserisci un URL')
            return
        }

        setManualTestResult('Invio in corso...')

        try {
            const res = await fetch('/api/admin/diagnostics/send-test-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: testWebhookUrl })
            })
            const data = await res.json()
            setManualTestResult(data.success
                ? `Successo! Status: ${data.status}`
                : `Errore: ${data.error}`)
        } catch (err) {
            setManualTestResult(`Errore: ${err}`)
        }
    }

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
            case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            default: return <Clock className="w-5 h-5 text-muted-foreground" />
        }
    }

    const getStatusBadge = (status: TestResult['status']) => {
        switch (status) {
            case 'success': return <Badge className="bg-green-500/20 text-green-500">OK</Badge>
            case 'error': return <Badge className="bg-red-500/20 text-red-500">Errore</Badge>
            case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-500">Attenzione</Badge>
            case 'running': return <Badge className="bg-blue-500/20 text-blue-500">In corso</Badge>
            default: return <Badge variant="outline">In attesa</Badge>
        }
    }

    const passedCount = tests.filter(t => t.status === 'success').length
    const failedCount = tests.filter(t => t.status === 'error').length
    const warningCount = tests.filter(t => t.status === 'warning').length

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin/integrations" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Torna a Integrazioni
                    </Link>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Diagnostica Webhook</h1>
                            <p className="text-muted-foreground">Verifica lo stato dell'integrazione TMS-LMS</p>
                        </div>
                        <Button onClick={runDiagnostics} disabled={isRunning}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                            {isRunning ? 'In esecuzione...' : 'Esegui Diagnostica'}
                        </Button>
                    </div>
                </div>

                {/* Summary */}
                {tests.some(t => t.status !== 'pending') && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <Card className="border-green-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription>Test Passati</CardDescription>
                                <CardTitle className="text-3xl text-green-500">{passedCount}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="border-yellow-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription>Attenzione</CardDescription>
                                <CardTitle className="text-3xl text-yellow-500">{warningCount}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="border-red-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription>Errori</CardDescription>
                                <CardTitle className="text-3xl text-red-500">{failedCount}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                )}

                {/* Test Results */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Test di Sistema
                        </CardTitle>
                        <CardDescription>
                            Verifica tutti i componenti dell'integrazione webhook
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {tests.map((test, index) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        {getStatusIcon(test.status)}
                                        <div>
                                            <div className="font-medium">{test.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {test.message}
                                                {test.duration && <span className="ml-2">({test.duration}ms)</span>}
                                            </div>
                                            {test.details && (
                                                <div className="text-xs text-muted-foreground mt-1">{test.details}</div>
                                            )}
                                        </div>
                                    </div>
                                    {getStatusBadge(test.status)}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Manual Test */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5" />
                            Test Webhook Manuale
                        </CardTitle>
                        <CardDescription>
                            Invia un webhook di test a un endpoint specifico
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Input
                                placeholder="https://example.com/webhook"
                                value={testWebhookUrl}
                                onChange={(e) => setTestWebhookUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={sendTestWebhook}>
                                <Send className="w-4 h-4 mr-2" />
                                Invia Test
                            </Button>
                        </div>
                        {manualTestResult && (
                            <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
                                {manualTestResult}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info */}
                <div className="mt-8 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        I webhook vengono salvati nella tabella <code className="bg-muted px-1 rounded">WebhookEvent</code>
                    </p>
                    <p className="flex items-center gap-2 mt-2">
                        <Globe className="w-4 h-4" />
                        Endpoint webhook: <code className="bg-muted px-1 rounded">/api/webhooks/tms</code>
                    </p>
                </div>
            </div>
        </div>
    )
}
