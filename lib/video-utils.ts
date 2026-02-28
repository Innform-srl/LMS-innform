/**
 * Video Utilities
 * Support per YouTube, Vimeo, Google Drive e video diretti (MP4, etc.)
 */

export interface VideoInfo {
    provider: 'youtube' | 'vimeo' | 'googledrive' | 'direct' | 'unknown'
    embedUrl: string
    videoId?: string
}

/**
 * Detect video provider from URL
 */
export function detectVideoProvider(url: string): VideoInfo {
    if (!url) {
        return { provider: 'unknown', embedUrl: '' }
    }

    // YouTube detection
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const youtubeMatch = url.match(youtubeRegex)

    if (youtubeMatch) {
        const videoId = youtubeMatch[1]
        return {
            provider: 'youtube',
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            videoId
        }
    }

    // Vimeo detection
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/
    const vimeoMatch = url.match(vimeoRegex)

    if (vimeoMatch) {
        const videoId = vimeoMatch[1]
        return {
            provider: 'vimeo',
            embedUrl: `https://player.vimeo.com/video/${videoId}`,
            videoId
        }
    }

    // Google Drive detection
    const gdriveRegex = /drive\.google\.com\/file\/d\/([^\/]+)/
    const gdriveMatch = url.match(gdriveRegex)

    if (gdriveMatch) {
        const fileId = gdriveMatch[1]
        return {
            provider: 'googledrive',
            embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
            videoId: fileId
        }
    }

    // Direct video URL (MP4, WEBM, etc.)
    if (url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith('blob:') || url.startsWith('data:')) {
        return {
            provider: 'direct',
            embedUrl: url
        }
    }

    // Unknown/fallback
    return {
        provider: 'unknown',
        embedUrl: url
    }
}

/**
 * Get YouTube embed URL with parameters
 */
export function getYouTubeEmbedUrl(videoId: string, options?: {
    autoplay?: boolean
    controls?: boolean
    modestbranding?: boolean
    rel?: boolean
    start?: number
}) {
    const params = new URLSearchParams()

    if (options?.autoplay) params.set('autoplay', '1')
    if (options?.controls === false) params.set('controls', '0')
    if (options?.modestbranding) params.set('modestbranding', '1')
    if (options?.rel === false) params.set('rel', '0')
    if (options?.start) params.set('start', String(options.start))

    const queryString = params.toString()
    return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`
}

/**
 * Get Vimeo embed URL with parameters
 */
export function getVimeoEmbedUrl(videoId: string, options?: {
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
}) {
    const params = new URLSearchParams()

    if (options?.autoplay) params.set('autoplay', '1')
    if (options?.loop) params.set('loop', '1')
    if (options?.muted) params.set('muted', '1')

    const queryString = params.toString()
    return `https://player.vimeo.com/video/${videoId}${queryString ? '?' + queryString : ''}`
}

/**
 * Calculate completion percentage
 */
export function calculateCompletion(watchedSeconds: number, totalSeconds: number): number {
    if (!totalSeconds || totalSeconds === 0) return 0
    return Math.min(100, (watchedSeconds / totalSeconds) * 100)
}

/**
 * Check if video is considered complete (90% threshold)
 */
export function isVideoComplete(watchedSeconds: number, totalSeconds: number): boolean {
    const completion = calculateCompletion(watchedSeconds, totalSeconds)
    return completion >= 90
}

/**
 * Format seconds to readable time (e.g., "12:34" or "1:23:45")
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
}
