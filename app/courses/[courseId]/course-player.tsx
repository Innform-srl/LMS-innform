"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { updateProgress } from "@/app/actions/enrollments"
import { markModuleComplete, trackModuleTime, getVideoProgress } from "@/app/actions/video-progress"
import { VideoPlayer } from "@/components/video-player"
import dynamic from "next/dynamic"
import { CourseDiscussion } from "@/components/course-discussion"
import { CertificatePreview } from "@/components/certificate-preview"
import { JoinSessionButton } from "@/components/join-session-button"
import { useRouter } from "next/navigation"
import confetti from 'canvas-confetti'
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Calendar } from "lucide-react"
import { apiUrl } from "@/lib/api"

// Dynamic import to avoid SSR issues with PDF.js
const PDFViewer = dynamic(() => import("@/components/pdf-viewer").then(mod => ({ default: mod.PDFViewer })), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8">Caricamento PDF...</div>
})

type Module = {
    id: string
    title: string
    description: string | null
    videoUrl: string | null
    contentType?: string | null
    pdfUrl?: string | null
    totalPages?: number | null
    minimumDuration?: number | null
    position: number
    quiz?: {
        id: string
        title: string
    } | null
    liveSession?: {
        id: string
        title: string
        description: string | null
        startTime: Date | null
        endTime: Date | null
        meetingUrl: string | null
    } | null
}

type Course = {
    id: string
    title: string
    description: string | null
    minimumDuration: number
}

type Enrollment = {
    id: string
    progress: number
    completed: boolean
    timeSpent: number
    certificate?: {
        id: string
        certificateNumber: string
    } | null
}

interface CoursePlayerProps {
    course: Course & { modules: Module[] }
    modules: Module[]
    enrollment: Enrollment
    completedModuleIds: string[]
    userName: string
    userId: string
}

export function CoursePlayer({
    course,
    modules,
    enrollment,
    completedModuleIds,
    userName: initialUserName,
    userId
}: CoursePlayerProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
    const [completedModules, setCompletedModules] = useState<Set<string>>(new Set(completedModuleIds))
    const [showCertificate, setShowCertificate] = useState(false)
    const [userName, setUserName] = useState(initialUserName)
    const [showTimePopup, setShowTimePopup] = useState(false)
    const [hasShownTimePopup, setHasShownTimePopup] = useState(false)

    // Track time locally for real-time UI updates (Course total)
    const [localTimeSpent, setLocalTimeSpent] = useState(enrollment.timeSpent)

    // Module specific time tracking
    const [moduleTimeSpent, setModuleTimeSpent] = useState(0)
    const [isTrackingModule, setIsTrackingModule] = useState(false)

    // Refs to prevent duplicate certificate generation and optimize re-renders
    const certificateGeneratedRef = useRef(false)
    const timeThresholdMetRef = useRef(false)

    // Refs for internal time tracking to avoid re-renders every 5 seconds
    const moduleTimeRef = useRef(0)
    const localTimeRef = useRef(enrollment.timeSpent)

    const currentModule = modules[currentModuleIndex]
    const progress = modules.length > 0 ? (completedModules.size / modules.length) * 100 : 0
    const isCompleted = progress === 100


    useEffect(() => {
        if (progress !== enrollment.progress) {
            updateProgress(course.id, progress)
        }
    }, [progress, course.id, enrollment.progress])

    // Sync local time with prop updates
    useEffect(() => {
        localTimeRef.current = enrollment.timeSpent
        // Use requestAnimationFrame to avoid synchronous setState in effect
        requestAnimationFrame(() => {
            setLocalTimeSpent(enrollment.timeSpent)
        })
    }, [enrollment.timeSpent])

    // Load initial module progress
    useEffect(() => {
        const loadModuleProgress = async () => {
            setIsTrackingModule(false)
            const progress = await getVideoProgress(currentModule.id)
            const timeSpent = progress ? ((progress as { timeSpent?: number }).timeSpent || 0) : 0
            setModuleTimeSpent(timeSpent)
            moduleTimeRef.current = timeSpent
            uiUpdateCounterRef.current = 0
            setIsTrackingModule(true)
        }
        loadModuleProgress()
    }, [currentModule.id])

    // Track time for ALL modules
    const unsavedSecondsRef = useRef(0)
    const uiUpdateCounterRef = useRef(0)

    useEffect(() => {
        if (!isTrackingModule) return

        const interval = setInterval(() => {
            if (document.hidden) return

            unsavedSecondsRef.current += 5
            moduleTimeRef.current += 5
            localTimeRef.current += 5
            uiUpdateCounterRef.current += 1

            // Save to DB every 30 seconds
            if (unsavedSecondsRef.current >= 30) {
                trackModuleTime(currentModule.id, unsavedSecondsRef.current)
                unsavedSecondsRef.current = 0
            }

            // Update UI only every 30 seconds (6 intervals of 5s) to reduce re-renders
            if (uiUpdateCounterRef.current >= 6) {
                setModuleTimeSpent(moduleTimeRef.current)
                setLocalTimeSpent(localTimeRef.current)
                uiUpdateCounterRef.current = 0
            }
        }, 5000)

        return () => {
            clearInterval(interval)
            // Attempt to save remaining time on unmount
            if (unsavedSecondsRef.current > 0) {
                trackModuleTime(currentModule.id, unsavedSecondsRef.current)
                unsavedSecondsRef.current = 0
            }
        }
    }, [currentModule.id, currentModule.contentType, isTrackingModule])

    const handleStartQuiz = async () => {
        if (unsavedSecondsRef.current > 0) {
            await trackModuleTime(currentModule.id, unsavedSecondsRef.current)
            unsavedSecondsRef.current = 0
        }
    }

    // Check for course completion and certificate generation
    // Using ref to prevent multiple API calls when localTimeSpent updates every 5 seconds
    useEffect(() => {
        // Skip if certificate already generated or in progress
        if (certificateGeneratedRef.current || enrollment.certificate) return

        const meetsRequirements = isCompleted &&
            course.minimumDuration > 0 &&
            localTimeSpent >= course.minimumDuration

        if (!meetsRequirements) return

        const checkCertificate = async () => {
            certificateGeneratedRef.current = true // Prevent duplicate calls

            try {
                const res = await fetch(apiUrl(`/api/certificates/generate`), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enrollmentId: enrollment.id })
                })

                if (res.ok) {
                    const data = await res.json()

                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    })

                    setShowCertificate(true)
                    setUserName(data.userName || "Studente")

                    fetch(apiUrl('/api/user/add-points'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            points: 100,
                            reason: `COURSE_COMPLETED_${course.id}`,
                            metadata: { courseId: course.id, courseTitle: course.title }
                        })
                    }).catch(err => console.error('Gamification error:', err))

                    setTimeout(() => {
                        router.refresh()
                    }, 1000)
                } else {
                    certificateGeneratedRef.current = false // Allow retry on failure
                }
            } catch (error) {
                console.error("Error generating certificate:", error)
                certificateGeneratedRef.current = false // Allow retry on failure
            }
        }

        checkCertificate()
    }, [isCompleted, localTimeSpent, course.minimumDuration, enrollment.certificate, enrollment.id, router, course.id, course.title])

    // Check for time threshold popup
    // Using ref to prevent running every 5 seconds after threshold is already met
    useEffect(() => {
        // Skip if already shown or already met threshold
        if (timeThresholdMetRef.current || hasShownTimePopup) return

        const meetsThreshold = course.minimumDuration > 0 &&
            localTimeSpent >= course.minimumDuration * 60 &&
            !enrollment.certificate

        if (!meetsThreshold) return

        timeThresholdMetRef.current = true
        // Use requestAnimationFrame to avoid synchronous setState in effect
        requestAnimationFrame(() => {
            setShowTimePopup(true)
            setHasShownTimePopup(true)
        })
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        })
    }, [localTimeSpent, course.minimumDuration, hasShownTimePopup, enrollment.certificate])

    const handleMarkComplete = async () => {
        const moduleId = currentModule.id
        const result = await markModuleComplete(moduleId)

        if (!result.success) {
            toast({
                title: "Non puoi ancora completare il modulo",
                description: result.error,
                variant: "destructive"
            })
            return
        }

        setCompletedModules(prev => new Set(prev).add(moduleId))

        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
        })

        router.refresh()

        if (currentModuleIndex < modules.length - 1) {
            setTimeout(() => {
                setCurrentModuleIndex(currentModuleIndex + 1)
            }, 500)
        }
    }

    const getVideoEmbedUrl = (url: string | null) => {
        if (!url) return null
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
        if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
        return null
    }

    // Helper per formattare il tempo del modulo
    const formatModuleTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}m ${s}s`
    }

    if (modules.length === 0) {
        return (
            <div className="min-h-screen p-8">
                <Link href="/courses" className="text-sm text-gray-400 hover:text-gray-300 mb-4 block">
                    ← Torna ai corsi
                </Link>
                <div className="text-center py-20">
                    <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">Nessun modulo disponibile</h3>
                    <p className="text-muted-foreground">Questo corso non ha ancora moduli disponibili.</p>
                </div>
            </div>
        )
    }

    const embedUrl = getVideoEmbedUrl(currentModule.videoUrl)

    const timeProgress = course.minimumDuration > 0
        ? Math.min((localTimeSpent / (course.minimumDuration * 60)) * 100, 100)
        : 100

    const timeHours = Math.floor(localTimeSpent / 3600)
    const timeMinutes = Math.floor((localTimeSpent % 3600) / 60)
    const requiredHours = Math.floor(course.minimumDuration / 60)
    const requiredMinutes = course.minimumDuration % 60

    const _getTimeColor = () => {
        if (timeProgress >= 100) return 'text-green-400'
        if (timeProgress >= 80) return 'text-yellow-400'
        if (timeProgress >= 50) return 'text-orange-400'
        return 'text-red-400'
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="glass border-b border-border sticky top-0 z-50 backdrop-blur-xl transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <Link href="/courses" className="p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-foreground truncate max-w-[300px]">{course.title}</h1>
                                <p className="text-xs text-muted-foreground">{currentModule.title}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {/* Course Time Card */}
                            {course.minimumDuration > 0 && (
                                <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-border min-w-[200px]">
                                    <div className={`p-2 rounded-lg ${timeProgress >= 100 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs text-muted-foreground">Tempo Totale</span>
                                            <span className={`text-xs font-mono font-bold ${timeProgress >= 100 ? 'text-green-400' : 'text-foreground'}`}>
                                                {Math.round(timeProgress)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                                            <div
                                                className={`h-full transition-all duration-500 ${timeProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${timeProgress}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono text-right">
                                            {timeHours}h {timeMinutes}m / {requiredHours}h {requiredMinutes}m
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Module Time Card */}
                            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-border min-w-[200px]">
                                <div className={`p-2 rounded-lg ${currentModule.minimumDuration && currentModule.minimumDuration > 0 && moduleTimeSpent >= (currentModule.minimumDuration * 60)
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-primary/20 text-primary'
                                    }`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs text-muted-foreground">Tempo Modulo</span>
                                        <span className={`text-xs font-mono font-bold ${currentModule.minimumDuration && currentModule.minimumDuration > 0 && moduleTimeSpent >= (currentModule.minimumDuration * 60)
                                            ? 'text-green-400'
                                            : 'text-foreground'
                                            }`}>
                                            {formatModuleTime(moduleTimeSpent)}
                                        </span>
                                    </div>
                                    {currentModule.minimumDuration && currentModule.minimumDuration > 0 ? (
                                        <>
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                                                <div
                                                    className={`h-full transition-all duration-500 ${moduleTimeSpent >= (currentModule.minimumDuration * 60) ? 'bg-green-500' : 'bg-primary'}`}
                                                    style={{ width: `${Math.min((moduleTimeSpent / (currentModule.minimumDuration * 60)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono text-right">
                                                Minimo: {currentModule.minimumDuration}m
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                            Nessun limite minimo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="glass border-border rounded-xl overflow-hidden shadow-2xl"
                        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
                        {currentModule.contentType === 'PDF' || currentModule.pdfUrl ? (
                            <div className="bg-card h-[76vh] relative overflow-hidden">
                                {currentModule.pdfUrl ? (
                                    <PDFViewer
                                        pdfUrl={currentModule.pdfUrl}
                                        totalPages={currentModule.totalPages || undefined}
                                        onComplete={handleMarkComplete}
                                    />
                                ) : (
                                    <div className="text-center text-muted-foreground p-8">
                                        Errore nel caricamento del PDF
                                    </div>
                                )}
                            </div>
                        ) : currentModule.contentType === 'LIVE' && currentModule.liveSession ? (
                            <div className="bg-card min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Calendar className="w-12 h-12 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">{currentModule.liveSession.title}</h2>
                                    <p className="text-muted-foreground max-w-lg mx-auto">
                                        {currentModule.liveSession.description || "Partecipa alla sessione live per completare questo modulo."}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
                                    <div className="bg-muted/50 p-4 rounded-xl border border-border">
                                        <div className="text-sm text-muted-foreground mb-1">Inizio</div>
                                        <div className="font-semibold text-lg">
                                            {currentModule.liveSession.startTime ? (() => { const d = new Date(currentModule.liveSession.startTime!); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` })() : 'N/D'}
                                        </div>
                                        <div className="text-primary font-bold">
                                            {currentModule.liveSession.startTime ? (() => { const d = new Date(currentModule.liveSession.startTime!); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` })() : '--:--'}
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-xl border border-border">
                                        <div className="text-sm text-muted-foreground mb-1">Fine</div>
                                        <div className="font-semibold text-lg">
                                            {currentModule.liveSession.endTime ? (() => { const d = new Date(currentModule.liveSession.endTime!); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` })() : 'N/D'}
                                        </div>
                                        <div className="text-primary font-bold">
                                            {currentModule.liveSession.endTime ? (() => { const d = new Date(currentModule.liveSession.endTime!); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` })() : '--:--'}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 w-full max-w-xs">
                                    {currentModule.liveSession.endTime && new Date(currentModule.liveSession.endTime) < new Date() ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
                                            <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">⏰ Sessione Terminata</p>
                                            <p className="text-muted-foreground">
                                                Questa sessione live si è conclusa. Contatta il tuo amministratore se hai bisogno di accedere alla registrazione.
                                            </p>
                                        </div>
                                    ) : (
                                        <JoinSessionButton
                                            meetingUrl={currentModule.liveSession.meetingUrl || ''}
                                            moduleId={currentModule.id}
                                            liveSessionId={currentModule.liveSession.id}
                                            userId={userId}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <VideoPlayer
                                videoUrl={embedUrl || ""}
                                moduleId={currentModule.id}
                                minDuration={currentModule.minimumDuration || 0}
                                onComplete={handleMarkComplete}
                            />
                        )}
                    </div>

                    <div className="glass border-border p-6 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-foreground">{currentModule.title}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentModule.contentType === 'PDF' && !completedModules.has(currentModule.id) && (
                                    <Button
                                        onClick={handleMarkComplete}
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Segna come completato
                                    </Button>
                                )}
                                {completedModules.has(currentModule.id) && (
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Completato
                                    </span>
                                )}
                            </div>
                        </div>
                        {currentModule.description && (
                            <div
                                className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: currentModule.description }}
                            />
                        )}
                    </div>

                    <div className="flex justify-between gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentModuleIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentModuleIndex === 0}
                            className="flex-1 py-6 border-border hover:bg-accent hover:text-accent-foreground"
                        >
                            ← Modulo Precedente
                        </Button>
                        <Button
                            onClick={() => {
                                if (currentModuleIndex < modules.length - 1) {
                                    setCurrentModuleIndex(prev => prev + 1)
                                } else {
                                    router.push('/courses')
                                }
                            }}
                            className="flex-1 py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {currentModuleIndex < modules.length - 1 ? "Prossimo Modulo →" : "Torna ai Corsi"}
                        </Button>
                    </div>

                    <div className="mt-12">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            Discussione del Corso
                        </h3>
                        <CourseDiscussion courseId={course.id} />
                    </div>
                </div >

                <div className="space-y-6 sticky top-24 self-start">
                    <div className="glass border-border rounded-xl p-6">
                        <h3 className="font-bold mb-4 text-lg border-b border-border pb-4">Contenuto del Corso</h3>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {modules.map((module, index) => (
                                <div
                                    key={module.id}
                                    onClick={() => setCurrentModuleIndex(index)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${currentModuleIndex === index
                                        ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10'
                                        : 'bg-muted/50 border-border hover:bg-muted hover:border-border'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${completedModules.has(module.id)
                                            ? 'bg-green-500 text-white'
                                            : currentModuleIndex === index
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {completedModules.has(module.id) ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span className="text-sm font-bold">{index + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${currentModuleIndex === index ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                {module.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {module.contentType === 'PDF' ? (
                                                        <>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            PDF
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Video
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {currentModule.quiz && (
                        <div className="glass border-border rounded-xl p-6 bg-primary/5 border-primary/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">Quiz: {currentModule.quiz.title}</h3>
                                    <p className="text-sm text-muted-foreground">Verifica le tue conoscenze su questo modulo</p>
                                </div>
                            </div>
                            <Link href={`/quiz/${currentModule.quiz.id}`}>
                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                                    onClick={handleStartQuiz}
                                >
                                    Inizia Quiz
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div >

            {
                showCertificate && enrollment.certificate && (
                    <CertificatePreview
                        onClose={() => setShowCertificate(false)}
                        certificateId={enrollment.certificate.id}
                        userName={userName}
                        courseTitle={course.title}
                        certificateNumber={enrollment.certificate.certificateNumber}
                    />
                )
            }

            <Dialog open={showTimePopup} onOpenChange={setShowTimePopup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            ⏱️ Obiettivo Tempo Raggiunto!
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {isCompleted ? (
                                "Congratulazioni! Hai completato il corso e raggiunto il tempo minimo richiesto. Il tuo certificato è pronto per essere scaricato."
                            ) : (
                                "Ottimo lavoro! Hai raggiunto il tempo minimo di studio richiesto per questo corso."
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {!isCompleted && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-600 dark:text-yellow-400">
                                <p className="font-semibold mb-1">⚠️ Attenzione</p>
                                <p>Per ottenere il certificato devi ancora completare tutti i moduli e superare il quiz finale (se presente).</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowTimePopup(false)}>
                            {isCompleted ? "Fantastico!" : "Ho capito, continuo a studiare"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
