"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import { formatDateOnly } from "@/lib/utils"

type CertificateSettings = {
    id: string
    companyName: string
    signerName: string
    signerTitle: string
    primaryColor: string
    accentColor: string
    headerText: string
    bodyTemplate: string
    logoUrl: string | null
}

export default function CertificateSettingsPage() {
    const router = useRouter()
    const [settings, setSettings] = useState<CertificateSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch(apiUrl("/api/admin/certificate-settings"))
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!settings) return

        setSaving(true)
        try {
            const res = await fetch(apiUrl("/api/admin/certificate-settings"), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                alert("Impostazioni salvate con successo!")
                router.refresh()
            } else {
                alert("Errore nel salvare le impostazioni")
            }
        } catch (error) {
            console.error("Error saving settings:", error)
            alert("Errore nel salvare le impostazioni")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">Caricamento...</div>
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="p-8">
                <div className="text-center text-red-500">Errore nel caricare le impostazioni</div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-background text-foreground">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Impostazioni Certificati</h1>
                <p className="text-muted-foreground">Configura l&apos;aspetto e il contenuto dei certificati</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form */}
                <div className="space-y-6">
                    {/* Company Info */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                            <span className="w-1 h-5 bg-primary rounded-full" />
                            Informazioni Aziendali
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="companyName">Nome Azienda</Label>
                                <Input
                                    id="companyName"
                                    value={settings.companyName}
                                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                    placeholder="INNFORM S.r.l."
                                    className="mt-1 bg-background border-border"
                                />
                            </div>

                            <div>
                                <Label htmlFor="signerName">Nome Firmatario</Label>
                                <Input
                                    id="signerName"
                                    value={settings.signerName}
                                    onChange={(e) => setSettings({ ...settings, signerName: e.target.value })}
                                    placeholder="Mario Rossi"
                                    className="mt-1 bg-background border-border"
                                />
                            </div>

                            <div>
                                <Label htmlFor="signerTitle">Titolo Firmatario</Label>
                                <Input
                                    id="signerTitle"
                                    value={settings.signerTitle}
                                    onChange={(e) => setSettings({ ...settings, signerTitle: e.target.value })}
                                    placeholder="Direttore Generale"
                                    className="mt-1 bg-background border-border"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Design */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                            <span className="w-1 h-5 bg-primary rounded-full" />
                            Design
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="primaryColor">Colore Primario</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            id="primaryColor"
                                            type="color"
                                            value={settings.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                            className="w-20 h-10 p-1 bg-background border-border"
                                        />
                                        <Input
                                            value={settings.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                            placeholder="#6366f1"
                                            className="flex-1 bg-background border-border"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="accentColor">Colore Accento</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            id="accentColor"
                                            type="color"
                                            value={settings.accentColor}
                                            onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                                            className="w-20 h-10 p-1 bg-background border-border"
                                        />
                                        <Input
                                            value={settings.accentColor}
                                            onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                                            placeholder="#8b5cf6"
                                            className="flex-1 bg-background border-border"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                            <span className="w-1 h-5 bg-primary rounded-full" />
                            Contenuto
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="headerText">Titolo Certificato</Label>
                                <Input
                                    id="headerText"
                                    value={settings.headerText}
                                    onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                                    placeholder="Certificato di Completamento"
                                    className="mt-1 bg-background border-border"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bodyTemplate">Template Testo</Label>
                                <Textarea
                                    id="bodyTemplate"
                                    value={settings.bodyTemplate}
                                    onChange={(e) => setSettings({ ...settings, bodyTemplate: e.target.value })}
                                    placeholder="Questo certifica che {userName} ha completato..."
                                    className="mt-1 min-h-[100px] bg-background border-border"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Variabili disponibili: {"{userName}"}, {"{courseTitle}"}, {"{completionDate}"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {saving ? "Salvataggio..." : "Salva Impostazioni"}
                        </Button>
                        <Button
                            onClick={() => setShowPreview(true)}
                            variant="outline"
                            className="border-border hover:bg-accent hover:text-accent-foreground"
                        >
                            Anteprima
                        </Button>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Anteprima Live</h2>
                    <div className="bg-white rounded-lg p-8 shadow-2xl">
                        <div
                            className="border-t-8 rounded-t-lg pt-8"
                            style={{ borderColor: settings.primaryColor }}
                        >
                            <h1
                                className="text-3xl font-bold text-center mb-6"
                                style={{ color: settings.primaryColor }}
                            >
                                {settings.headerText}
                            </h1>

                            <div className="text-gray-700 text-center mb-8">
                                <p className="mb-2">{settings.companyName}</p>
                                <div className="max-w-md mx-auto">
                                    {settings.bodyTemplate
                                        .replace("{userName}", "Mario Rossi")
                                        .replace("{courseTitle}", "Sicurezza sul Lavoro")
                                        .replace("{completionDate}", formatDateOnly(new Date()))
                                    }
                                </div>
                            </div>

                            <div className="border-t-2 pt-6 mt-8 flex justify-between items-end">
                                <div>
                                    <div className="text-sm text-gray-500">Firmato da:</div>
                                    <div className="font-semibold">{settings.signerName}</div>
                                    <div className="text-sm text-gray-600">{settings.signerTitle}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Data:</div>
                                    <div className="font-semibold">{formatDateOnly(new Date())}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative border border-border">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold mb-4 text-foreground">Anteprima Certificato</h2>
                        <p className="text-muted-foreground mb-4">Questa è un&apos;anteprima del certificato basata sulle impostazioni correnti.</p>
                        <p className="text-sm text-muted-foreground">Per vedere il certificato completo con PDF, completa un corso.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
