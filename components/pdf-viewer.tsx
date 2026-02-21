"use client"

import { useState, useEffect, useRef } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useInView } from "react-intersection-observer"
import {
    ChevronLeft,
    ChevronRight,
    Maximize,
    Minimize,
    Loader2,
    Play,
    Pause,
    RotateCcw,
    Volume2,
    VolumeX,
    LayoutGrid
} from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PDFViewerProps {
    pdfUrl: string
    totalPages?: number
    onComplete?: () => void
}

// Thumbnail Component for Lazy Loading
const Thumbnail = ({
    pageNumber,
    isSelected,
    onClick
}: {
    pageNumber: number,
    isSelected: boolean,
    onClick: () => void
}) => {
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: '200px 0px', // Load when within 200px of viewport
    })

    return (
        <div
            ref={ref}
            onClick={onClick}
            className={`group relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 mx-auto ${isSelected
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-gray-600'
                }`}
            style={{ width: '120px', height: '68px' }} // Fixed height to prevent layout shift
        >
            <div className="aspect-video bg-gray-800 relative w-full h-full">
                {inView ? (
                    <Page
                        pageNumber={pageNumber}
                        width={120}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={<div className="w-full h-full bg-gray-800 animate-pulse" />}
                        className="w-full h-full object-contain"
                        error={<div className="w-full h-full flex items-center justify-center text-xs text-red-400">Error</div>}
                    />
                ) : (
                    <div className="w-full h-full bg-gray-800" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                {/* Page Number Badge */}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                    {pageNumber}
                </div>
            </div>
        </div>
    )
}

export function PDFViewer({ pdfUrl, totalPages: _initialTotalPages, onComplete }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, _setScale] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [containerWidth, setContainerWidth] = useState<number>(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [volume, setVolume] = useState(100)
    const [isMuted, setIsMuted] = useState(false)
    const [showThumbnails, setShowThumbnails] = useState(true)

    // Timer state
    const [timeElapsed, setTimeElapsed] = useState(0)
    const slideDuration = 10 // seconds per slide for auto-play

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0]) {
                setContainerWidth(entries[0].contentRect.width)
            }
        })

        resizeObserver.observe(containerRef.current)
        return () => resizeObserver.disconnect()
    }, [showThumbnails]) // Re-measure when sidebar toggles

    // Auto-advance
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isPlaying) {
            interval = setInterval(() => {
                setTimeElapsed(prev => {
                    const next = prev + 1
                    if (next >= slideDuration) {
                        handlePageChange(Math.min(numPages || 1, pageNumber + 1))
                        return 0
                    }
                    return next
                })
            }, 1000)
        }

        return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, pageNumber, numPages])

    // Reset timer on manual page change
    useEffect(() => {
        requestAnimationFrame(() => setTimeElapsed(0))
    }, [pageNumber])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        if (numPages === 1 && onComplete) {
            onComplete()
        }
    }

    const handlePageChange = (newPage: number) => {
        setPageNumber(newPage)
        if (newPage === numPages && onComplete) {
            onComplete()
        }
        // Stop playing if we reach the end
        if (newPage === numPages && isPlaying) {
            setIsPlaying(false)
        }
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div ref={containerRef} className={`flex flex-col h-full bg-black text-white overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'relative min-h-[600px] rounded-xl border border-zinc-800 shadow-2xl'}`}>
            <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="flex items-center justify-center h-full w-full text-white p-20">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        Caricamento Corso...
                    </div>
                }
                error={
                    <div className="flex items-center justify-center h-full w-full text-red-500 p-20">
                        Errore nel caricamento del file.
                    </div>
                }
                className="flex flex-1 h-full overflow-hidden"
            >
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative bg-black">
                    {/* Slide View */}
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative custom-scrollbar">
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            width={containerWidth ? Math.min(containerWidth - (showThumbnails ? 320 : 48), 1200) : undefined}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-2xl rounded-sm overflow-hidden"
                            loading={<Loader2 className="w-8 h-8 animate-spin text-red-600" />}
                        />
                    </div>

                    {/* Bottom Controls Bar */}
                    <div className="h-14 bg-black/90 border-t border-zinc-800 px-4 flex items-center gap-4 z-10">
                        {/* Play/Pause & Replay */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full hover:bg-white/10 text-white"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                                onClick={() => {
                                    setPageNumber(1)
                                    setIsPlaying(true)
                                }}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Progress Bar & Timer */}
                        <div className="flex-1 flex flex-col gap-1.5 group cursor-pointer">
                            {/* Progress Bar Container */}
                            <div className="relative h-1 w-full bg-zinc-700 group-hover:h-1.5 transition-all duration-200">
                                <div
                                    className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(timeElapsed / slideDuration) * 100}%` }}
                                />
                                {/* Scrubber Head (visible on hover) */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    style={{ left: `${(timeElapsed / slideDuration) * 100}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 px-0.5">
                                <span>{formatTime(timeElapsed)} / {formatTime(slideDuration)}</span>
                                <span>Slide {pageNumber} / {numPages || '--'}</span>
                            </div>
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center gap-2">
                            {/* Volume (Mock) */}
                            <div className="flex items-center gap-2 group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-400 hover:text-white"
                                    onClick={() => setIsMuted(!isMuted)}
                                >
                                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                                <div className="w-0 overflow-hidden group-hover:w-20 transition-all duration-300">
                                    <Slider
                                        value={[isMuted ? 0 : volume]}
                                        max={100}
                                        step={1}
                                        onValueChange={(v) => setVolume(v[0])}
                                        className="w-20 accent-white"
                                    />
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-400 hover:text-white"
                                    onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                                    disabled={pageNumber <= 1}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-400 hover:text-white"
                                    onClick={() => handlePageChange(Math.min(numPages || 1, pageNumber + 1))}
                                    disabled={pageNumber >= (numPages || 1)}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${showThumbnails ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                                onClick={() => setShowThumbnails(!showThumbnails)}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                                onClick={toggleFullscreen}
                            >
                                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Thumbnails (YouTube Playlist Style) */}
                {showThumbnails && (
                    <div className="w-48 bg-zinc-900 border-l border-zinc-800 flex flex-col transition-all duration-300 shrink-0">
                        <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-white">Slide Playlist</h3>
                            <span className="text-xs text-zinc-500">{pageNumber} / {numPages}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar overflow-x-hidden">
                            {numPages && Array.from(new Array(numPages), (el, index) => (
                                <div
                                    key={`thumb_container_${index + 1}`}
                                    className={`flex items-center justify-center p-2 cursor-pointer hover:bg-zinc-800 transition-colors ${pageNumber === index + 1 ? 'bg-zinc-800' : ''}`}
                                    onClick={() => handlePageChange(index + 1)}
                                >
                                    <div className="relative shrink-0">
                                        <Thumbnail
                                            key={`thumb_${index + 1}`}
                                            pageNumber={index + 1}
                                            isSelected={pageNumber === index + 1}
                                            onClick={() => { }} // Handled by parent div
                                        />
                                        {/* "Now Playing" Overlay */}
                                        {pageNumber === index + 1 && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center border-2 border-red-600 rounded-lg">
                                                <Play className="w-6 h-6 text-white fill-white" />
                                            </div>
                                        )}
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Document>
        </div>
    )
}

