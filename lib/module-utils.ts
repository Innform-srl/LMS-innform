import { Prisma } from "@prisma/client"

/**
 * Returns a Prisma where clause for modules that are currently
 * "effectively published" — published AND not expired.
 */
export function effectivelyPublishedModuleWhere(): Prisma.ModuleWhereInput {
    return {
        published: true,
        OR: [
            { publishedUntil: null },
            { publishedUntil: { gt: new Date() } },
        ],
    }
}

/**
 * Returns the expiration status for admin display purposes.
 */
export function getExpirationStatus(publishedUntil: Date | null): "none" | "active" | "expiring" | "expired" {
    if (!publishedUntil) return "none"
    const now = new Date()
    const date = new Date(publishedUntil)
    if (date <= now) return "expired"
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (date <= sevenDaysFromNow) return "expiring"
    return "active"
}
