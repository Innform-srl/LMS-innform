"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export interface AuditLogParams {
    action: string
    entityType: string
    entityId?: string
    metadata?: Record<string, any>
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: AuditLogParams) {
    try {
        const session = await auth()

        await db.auditLog.create({
            data: {
                userId: session?.user?.id,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: params.metadata || {},
                ipAddress: null, // Will be set by API route with request headers
                userAgent: null  // Will be set by API route with request headers
            }
        })
    } catch (error) {
        // Don't throw - logging should not break the application
        console.error("Failed to log audit event:", error)
    }
}

/**
 * Log audit event with request context (for API routes)
 */
export async function logAuditEventWithContext(
    params: AuditLogParams,
    request?: Request
) {
    try {
        const session = await auth()

        await db.auditLog.create({
            data: {
                userId: session?.user?.id,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: params.metadata || {},
                ipAddress: request?.headers.get('x-forwarded-for') ||
                    request?.headers.get('x-real-ip') ||
                    null,
                userAgent: request?.headers.get('user-agent') || null
            }
        })
    } catch (error) {
        console.error("Failed to log audit event:", error)
    }
}

/**
 * Get audit logs for admin (with pagination)
 */
export async function getAuditLogs(options?: {
    userId?: string
    action?: string
    entityType?: string
    page?: number
    limit?: number
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        const page = options?.page || 1
        const limit = options?.limit || 50
        const skip = (page - 1) * limit

        const where: any = {}
        if (options?.userId) where.userId = options.userId
        if (options?.action) where.action = options.action
        if (options?.entityType) where.entityType = options.entityType

        const [logs, total] = await Promise.all([
            db.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }),
            db.auditLog.count({ where })
        ])

        return {
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error("Error getting audit logs:", error)
        return { success: false, error: "Errore durante il recupero dei log" }
    }
}

/**
 * Common audit action types (for consistency)
 */
export const AuditActions = {
    // Course actions
    CREATE_COURSE: 'CREATE_COURSE',
    UPDATE_COURSE: 'UPDATE_COURSE',
    DELETE_COURSE: 'DELETE_COURSE',
    PUBLISH_COURSE: 'PUBLISH_COURSE',

    // Module actions
    CREATE_MODULE: 'CREATE_MODULE',
    UPDATE_MODULE: 'UPDATE_MODULE',
    DELETE_MODULE: 'DELETE_MODULE',

    // Quiz actions
    CREATE_QUIZ: 'CREATE_QUIZ',
    UPDATE_QUIZ: 'UPDATE_QUIZ',
    DELETE_QUIZ: 'DELETE_QUIZ',
    CREATE_QUESTION: 'CREATE_QUESTION',

    // User actions
    CREATE_USER: 'CREATE_USER',
    UPDATE_USER: 'UPDATE_USER',
    DELETE_USER: 'DELETE_USER',
    IMPORT_USERS: 'IMPORT_USERS',

    // Enrollment actions
    ENROLL_USER: 'ENROLL_USER',
    COMPLETE_COURSE: 'COMPLETE_COURSE',

    // Auth actions
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',

    // System actions
    CHANGE_SETTINGS: 'CHANGE_SETTINGS',
    EXPORT_DATA: 'EXPORT_DATA'
} as const
