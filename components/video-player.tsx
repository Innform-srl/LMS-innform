"use client"

import { useEffect, useRef, useState } from "react"
import { detectVideoProvider, formatTime, isVideoComplete } from "@/lib/video-utils"
import { updateVideoProgress } from "@/app/actions/video-progress"

interface VideoPlayerProps {
    videoUrl: string
    moduleId: string
    initialPosition?: number
    minDuration?: number // In minutes
    onProgress?: (watchedSeconds: number, totalSeconds: number) => void
    onComplete?: () => void
}

export function VideoPlayer({
    videoUrl,
    moduleId,
    initialPosition = 0,
    minDuration = 0,
    onProgress,
    onComplete
}: VideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [watchedSeconds, setWatchedSeconds] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const progressIntervalRef = useRef<any>(null)
    const lastSaveRef = useRef(0)

    const videoInfo = detectVideoProvider(videoUrl)

    // Save progress every 30 seconds
    const saveProgress = async (watched: number, total: number, position: number) => {
        const now = Date.now()
        if (now - lastSaveRef.current < 30000) return // Throttle to 30s

        lastSaveRef.current = now
        const result = await updateVideoProgress(moduleId, watched, total, position)

        if (result.success && onProgress) {
            onProgress(watched, total)
        }

        // Check for auto-complete
        if (isVideoComplete(watched, total) && onComplete) {
            onComplete()
        }
    }

    // Handle direct video (HTML5)
    useEffect(() => {
        if (videoInfo.provider !== 'direct' || !videoRef.current) return

        const video = videoRef.current

        // Set initial position
        if (initialPosition > 0) {
            video.currentTime = initialPosition
        }

        const handleTimeUpdate = () => {
            const current = video.currentTime
            const total = video.duration

            setCurrentTime(current)
            setDuration(total)

            // Track watched seconds (simplified - in production use more sophisticated tracking)
            if (current > watchedSeconds) {
                setWatchedSeconds(current)
                saveProgress(current, total, current)
            }
        }

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('loadedmetadata', () => setDuration(video.duration))

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
        }
    }, [videoInfo.provider, moduleId, initialPosition, watchedSeconds])

    // For YouTube/Vimeo, we track via postMessage API (more complex, simplified here)
    useEffect(() => {
        if (videoInfo.provider === 'direct') return

        // Set up periodic progress tracking for embedded videos
        // Note: We track continuously since we can't detect play/pause state from iframe
        progressIntervalRef.current = setInterval(() => {
            setCurrentTime(prev => prev + 1)
            setWatchedSeconds(prev => prev + 1)
        }, 1000)

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
            }
        }
    }, [videoInfo.provider])

    // Separate effect to save progress (avoids calling async function during setState)
    useEffect(() => {
        if (videoInfo.provider === 'direct') return
        if (watchedSeconds === 0) return

        const effectiveDuration = duration > 0 ? duration : (minDuration * 60)

        if (effectiveDuration > 0) {
            saveProgress(watchedSeconds, effectiveDuration, currentTime)
        } else {
            // Fallback: save with current watched as duration to ensure progress is recorded
            saveProgress(watchedSeconds, watchedSeconds, currentTime)
        }
    }, [watchedSeconds, duration, currentTime, moduleId, videoInfo.provider, minDuration])

    const effectiveDuration = duration > 0 ? duration : (minDuration * 60)
    const watchedPercentage = effectiveDuration > 0 ? Math.round((watchedSeconds / effectiveDuration) * 100) : 0

    // Render based on provider
    if (videoInfo.provider === 'direct') {
        return (
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                <video
                    ref={videoRef}
                    src={videoInfo.embedUrl}
                    controls
                    className="w-full h-full"
                    controlsList="nodownload"
                >
                    Il tuo browser non supporta il tag video.
                </video>

                {/* Progress indicator */}
                <div className="absolute bottom-16 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
                    <div className="flex items-center justify-between">
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        <span className="text-primary">
                            {watchedPercentage}% completato
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    if (videoInfo.provider === 'unknown' || !videoInfo.embedUrl) {
        return (
            <div className="relative w-full aspect-video bg-muted rounded-xl overflow-hidden flex items-center justify-center border border-border">
                <div className="text-center p-6">
                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">Video non disponibile</h3>
                    <p className="text-sm text-muted-foreground">
                        L'URL del video non è valido o mancante.
                        {videoUrl && <span className="block mt-2 text-xs font-mono bg-muted p-1 rounded">{videoUrl}</span>}
                    </p>
                </div>
            </div>
        )
    }

    // YouTube/Vimeo embedded player
    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
                ref={iframeRef}
                src={videoInfo.embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />

            {/* Progress indicator for embedded videos */}
            <div className="absolute bottom-16 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white pointer-events-none">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">
                        {videoInfo.provider === 'youtube' ? '📺 YouTube' : '📹 Vimeo'}
                    </span>
                    <span className="text-primary text-xs">
                        {watchedPercentage}% visto
                    </span>
                </div>
            </div>
        </div>
    )
}
