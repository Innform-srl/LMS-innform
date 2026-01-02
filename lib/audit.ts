// Utility functions for audit logging

import { db } from './db'

export interface AuditLogParams {
    userId?: string
    action: string
    entityType: string
    entityId?: string
    metadata?: any
    request?: Request
}

export async function logAuditEvent(params: AuditLogParams) {
    try {
        const ipAddress = params.request?.headers.get('x-forwarded-for') ||
            params.request?.headers.get('x-real-ip') ||
            null

        const userAgent = params.request?.headers.get('user-agent') || null

        await db.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: params.metadata || null,
                ipAddress,
                userAgent,
            }
        })
    } catch (error) {
        // Log to console but don't throw - audit logging should not break main flow
        console.error('Failed to log audit event:', error)
    }
}

// Predefined actions for consistency
export const AUDIT_ACTIONS = {
    // Course actions
    CREATE_COURSE: 'CREATE_COURSE',
    UPDATE_COURSE: 'UPDATE_COURSE',
    DELETE_COURSE: 'DELETE_COURSE',
    PUBLISH_COURSE: 'PUBLISH_COURSE',
    UNPUBLISH_COURSE: 'UNPUBLISH_COURSE',

    // Module actions
    CREATE_MODULE: 'CREATE_MODULE',
    UPDATE_MODULE: 'UPDATE_MODULE',
    DELETE_MODULE: 'DELETE_MODULE',

    // Quiz actions
    CREATE_QUIZ: 'CREATE_QUIZ',
    UPDATE_QUIZ: 'UPDATE_QUIZ',
    DELETE_QUIZ: 'DELETE_QUIZ',

    // User actions
    CREATE_USER: 'CREATE_USER',
    UPDATE_USER: 'UPDATE_USER',
    DELETE_USER: 'DELETE_USER',
    IMPORT_USERS: 'IMPORT_USERS',

    // Enrollment actions
    ENROLL_USER: 'ENROLL_USER',
    COMPLETE_COURSE: 'COMPLETE_COURSE',

    // Security actions
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    FAILED_LOGIN: 'FAILED_LOGIN',
    PASSWORD_RESET: 'PASSWORD_RESET',

    // Admin actions
    EXPORT_DATA: 'EXPORT_DATA',
    BULK_UPDATE: 'BULK_UPDATE',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]
