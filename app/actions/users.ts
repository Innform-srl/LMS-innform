"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { bulkEnrollUsers } from "@/lib/enrollment-utils"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { reportError } from "@/lib/error-reporting"

export async function approveUser(userId: string) {
    const check = await requirePermission("user:manage")
    if (!check.authorized) return { success: false, error: check.error }

    try {
        await db.user.update({
            where: { id: userId },
            data: {
                isApproved: true,
                approvedAt: new Date()
            }
        })

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        console.error("Error approving user:", error)
        reportError(error, { action: "approveUser" })
        return { success: false, error: "Failed to approve user" }
    }
}

export async function createUser(formData: FormData) {
    const check = await requirePermission("user:manage")
    if (!check.authorized) return { success: false, error: check.error }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string
    const departmentId = formData.get("departmentId") as string
    const companyId = formData.get("companyId") as string
    const learningPathIds = formData.getAll("learningPathIds") as string[]

    if (!name || !email || !password || !role) {
        return { success: false, error: "Missing required fields" }
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "Email already exists" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role as Role,
                departmentId: departmentId || null,
                companyId: companyId || null,
                isApproved: true, // Admin created users are auto-approved
                approvedAt: new Date(),
            }
        })

        // Batch enroll user in learning path courses - optimized query
        if (learningPathIds.length > 0) {
            const learningPaths = await db.learningPath.findMany({
                where: { id: { in: learningPathIds } },
                include: { courses: { select: { courseId: true } } }
            })

            const courseIds = [...new Set(
                learningPaths.flatMap(path => path.courses.map(c => c.courseId))
            )]

            for (const courseId of courseIds) {
                await bulkEnrollUsers([user.id], courseId)
            }
        }

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        console.error("Error creating user:", error)
        reportError(error, { action: "createUser" })
        return { success: false, error: "Failed to create user" }
    }
}

export async function resetUserPassword(userId: string, newPassword: string) {
    const check = await requirePermission("user:manage")
    if (!check.authorized) return { success: false, error: check.error }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await db.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Error resetting password:", error)
        reportError(error, { action: "resetUserPassword" })
        return { success: false, error: "Failed to reset password" }
    }
}

/**
 * Restore a soft-deleted user.
 */
export async function restoreUser(userId: string) {
    const check = await requirePermission("user:manage")
    if (!check.authorized) return { success: false, error: check.error }

    try {
        await db.user.update({
            where: { id: userId, deletedAt: { not: null } },
            data: { deletedAt: null },
        })

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        console.error("Error restoring user:", error)
        reportError(error, { action: "restoreUser" })
        return { success: false, error: "Failed to restore user" }
    }
}
