/**
 * Utilità per calcolare e formattare il tempo trascorso
 */

export function getTimeElapsed(startDate: Date): string {
    const now = new Date()
    const diff = now.getTime() - new Date(startDate).getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    if (months > 0) {
        return months === 1 ? '1 mese fa' : `${months} mesi fa`
    }
    if (weeks > 0) {
        return weeks === 1 ? '1 settimana fa' : `${weeks} settimane fa`
    }
    if (days > 0) {
        return days === 1 ? '1 giorno fa' : `${days} giorni fa`
    }
    if (hours > 0) {
        return hours === 1 ? '1 ora fa' : `${hours} ore fa`
    }
    if (minutes > 0) {
        return minutes === 1 ? '1 minuto fa' : `${minutes} minuti fa`
    }
    return 'Appena iniziato'
}

export function getDaysElapsed(startDate: Date): number {
    const now = new Date()
    const diff = now.getTime() - new Date(startDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getFormattedDuration(startDate: Date, endDate?: Date): string {
    const end = endDate || new Date()
    const diff = end.getTime() - new Date(startDate).getTime()

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
        return hours > 0 ? `${days}g ${hours}h` : `${days} giorni`
    }
    if (hours > 0) {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} ore`
    }

    const minutes = Math.floor(diff / (1000 * 60))
    return minutes > 0 ? `${minutes} minuti` : 'Appena iniziato'
}
