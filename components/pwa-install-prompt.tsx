"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Wifi, Bell, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    );
}

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
    );
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Don't show if already installed as PWA
        if (isStandalone()) return;

        // Check if dismissed (use localStorage with 1-day expiry)
        const dismissedAt = localStorage.getItem("pwa-install-dismissed-at");
        if (dismissedAt) {
            const oneDay = 24 * 60 * 60 * 1000;
            if (Date.now() - parseInt(dismissedAt) < oneDay) return;
        }

        if (isIOS()) {
            // iOS: show after a short delay for better UX
            const timer = setTimeout(() => setShowIOSGuide(true), 2000);
            return () => clearTimeout(timer);
        }

        // Android/Desktop: listen for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show modal after a short delay
            setTimeout(() => setShowPrompt(true), 1500);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setShowIOSGuide(false);
        localStorage.setItem("pwa-install-dismissed-at", Date.now().toString());
    };

    // Nothing to show
    if (!showPrompt && !showIOSGuide) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-primary/90 to-primary px-6 pt-6 pb-8 text-primary-foreground">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        aria-label="Chiudi"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <span className="font-bold text-xl">L</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">LMS Innform</h2>
                            <p className="text-sm opacity-80">Piattaforma E-learning</p>
                        </div>
                    </div>
                    <p className="text-sm opacity-90">
                        Installa l&apos;app per un&apos;esperienza migliore sul tuo dispositivo
                    </p>
                </div>

                {/* Features */}
                <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Smartphone className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Accesso rapido</p>
                            <p className="text-xs text-muted-foreground">Apri direttamente dalla home del telefono</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Wifi className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Schermo intero</p>
                            <p className="text-xs text-muted-foreground">Nessuna barra del browser, piu spazio</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Bell className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Notifiche</p>
                            <p className="text-xs text-muted-foreground">Ricevi aggiornamenti sui tuoi corsi</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6">
                    {showIOSGuide ? (
                        /* iOS instructions */
                        <div className="space-y-3">
                            <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
                                <p className="text-sm font-medium">Come installare su iPhone/iPad:</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                        1
                                    </span>
                                    <span>
                                        Tocca il pulsante <Share className="inline h-4 w-4 mx-0.5" /> Condividi
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                        2
                                    </span>
                                    <span>
                                        Scorri e tocca <Plus className="inline h-4 w-4 mx-0.5" /> &quot;Aggiungi a
                                        Home&quot;
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                        3
                                    </span>
                                    <span>Conferma toccando &quot;Aggiungi&quot;</span>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full" onClick={handleDismiss}>
                                Ho capito
                            </Button>
                        </div>
                    ) : (
                        /* Android/Desktop install button */
                        <div className="flex gap-2">
                            <Button className="flex-1 h-11" onClick={handleInstall}>
                                <Download className="h-4 w-4 mr-2" />
                                Installa App
                            </Button>
                            <Button variant="outline" className="h-11" onClick={handleDismiss}>
                                Non ora
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
