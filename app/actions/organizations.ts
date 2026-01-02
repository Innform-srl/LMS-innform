"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function getCompanies() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    try {
        return await db.company.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error("Error fetching companies:", error)
        return []
    }
}

export async function getDepartments() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    try {
        return await db.department.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error("Error fetching departments:", error)
        return []
    }
}

export async function searchUsers(query: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

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
        return []
    }
}
