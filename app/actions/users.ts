"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function approveUser(userId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await db.user.update({
            where: { id: userId },
            data: {
                isApproved: true,
                approvedAt: new Date()
            } as any
        })

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        console.error("Error approving user:", error)
        return { success: false, error: "Failed to approve user" }
    }
}

export async function createUser(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

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
                role: role as any,
                departmentId: departmentId || null,
                companyId: companyId || null,
                isApproved: true, // Admin created users are auto-approved
                approvedAt: new Date(),
            } as any
        })

        // Batch enroll user in learning path courses - optimized query
        if (learningPathIds.length > 0) {
            // Get all courses from selected learning paths in one query
            const learningPaths = await db.learningPath.findMany({
                where: { id: { in: learningPathIds } },
                include: { courses: { select: { courseId: true } } }
            })

            // Collect unique course IDs
            const courseIds = [...new Set(
                learningPaths.flatMap(path => path.courses.map(c => c.courseId))
            )]

            if (courseIds.length > 0) {
                // Create enrollments in batch, skip duplicates
                await db.enrollment.createMany({
                    data: courseIds.map(courseId => ({
                        userId: user.id,
                        courseId,
                        progress: 0
                    })),
                    skipDuplicates: true
                })
            }
        }

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        console.error("Error creating user:", error)
        return { success: false, error: "Failed to create user" }
    }
}

export async function resetUserPassword(userId: string, newPassword: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

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
        return { success: false, error: "Failed to reset password" }
    }
}
