"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { reportError } from "@/lib/error-reporting"

export async function getCompanies() {
    const check = await requirePermission("company:manage")
    if (!check.authorized) return []

    try {
        return await db.company.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error("Error fetching companies:", error)
        reportError(error, { action: "getCompanies" })
        return []
    }
}

export async function getDepartments() {
    const check = await requirePermission("company:manage")
    if (!check.authorized) return []

    try {
        return await db.department.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error("Error fetching departments:", error)
        reportError(error, { action: "getDepartments" })
        return []
    }
}

export async function searchUsers(query: string) {
    const check = await requirePermission("company:manage")
    if (!check.authorized) return []

    if (!query || query.length < 2) return []

    try {
        return await db.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ],
                role: "EMPLOYEE" // Only search employees
            },
            select: {
                id: true,
                name: true,
                email: true,
                department: { select: { name: true } },
                company: { select: { name: true } }
            },
            take: 10
        })
    } catch (error) {
        console.error("Error searching users:", error)
        reportError(error, { action: "searchUsers" })
        return []
    }
}
