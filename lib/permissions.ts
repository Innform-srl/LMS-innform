import { auth } from "@/lib/auth"

type Role = "ADMIN" | "EMPLOYEE" | "TEACHER"

const PERMISSIONS = {
    // Course management
    "course:create": ["ADMIN"],
    "course:edit": ["ADMIN"],
    "course:delete": ["ADMIN"],
    "course:archive": ["ADMIN"],
    "course:publish": ["ADMIN"],

    // Module management
    "module:create": ["ADMIN", "TEACHER"],
    "module:edit": ["ADMIN", "TEACHER"],
    "module:delete": ["ADMIN", "TEACHER"],
    "module:publish": ["ADMIN"],
    "module:reorder": ["ADMIN", "TEACHER"],
    "module:duplicate": ["ADMIN"],

    // Quiz management
    "quiz:create": ["ADMIN", "TEACHER"],
    "quiz:edit": ["ADMIN", "TEACHER"],
    "quiz:delete": ["ADMIN", "TEACHER"],

    // User management
    "user:manage": ["ADMIN"],
    "user:approve": ["ADMIN"],
    "user:create": ["ADMIN"],

    // Enrollment management
    "enrollment:manage": ["ADMIN"],

    // Analytics & reports
    "analytics:view": ["ADMIN"],
    "reports:view": ["ADMIN"],

    // Live sessions
    "live-session:manage": ["ADMIN", "TEACHER"],

    // Registers (attendance)
    "register:manage": ["ADMIN", "TEACHER"],

    // Learning paths
    "learning-path:manage": ["ADMIN"],

    // Company/department management
    "company:manage": ["ADMIN"],

    // Audit logs
    "audit:view": ["ADMIN"],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a role has a specific permission.
 */
export function canPerform(role: Role, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission]
    return (allowedRoles as readonly string[]).includes(role)
}

/**
 * Check permission from the current session.
 * Returns the session if authorized, or null if not.
 * Use in server actions that need role-based access control.
 */
export async function requirePermission(permission: Permission) {
    const session = await auth()

    if (!session?.user?.id) {
        return { authorized: false as const, error: "Non autenticato" }
    }

    const role = session.user.role as Role | undefined
    if (!role || !canPerform(role, permission)) {
        return { authorized: false as const, error: "Non autorizzato" }
    }

    // Type narrowing: we verified user.id exists above
    return { authorized: true as const, session: session as typeof session & { user: { id: string } } }
}

/**
 * Simple authentication check without role verification.
 * For actions available to any authenticated user.
 */
export async function requireAuth() {
    const session = await auth()

    if (!session?.user?.id) {
        return { authorized: false as const, error: "Non autenticato" }
    }

    // Type narrowing: we verified user.id exists above
    return { authorized: true as const, session: session as typeof session & { user: { id: string } } }
}
