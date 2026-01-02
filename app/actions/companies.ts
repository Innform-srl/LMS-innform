"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const companySchema = z.object({
    name: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
})

export async function createCompany(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    const name = formData.get("name") as string
    const validatedFields = companySchema.safeParse({ name })

    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.issues[0].message }
    }

    try {
        const existingCompany = await db.company.findUnique({
            where: { name: validatedFields.data.name }
        })

        if (existingCompany) {
            return { success: false, error: "Un'azienda con questo nome esiste già" }
        }

        await db.company.create({
            data: {
                name: validatedFields.data.name
            }
        })

        revalidatePath("/admin/users/companies")
        return { success: true }
    } catch (error) {
        console.error("Error creating company:", error)
        return { success: false, error: "Errore durante la creazione dell'azienda" }
    }
}

export async function deleteCompany(companyId: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Non autorizzato" }
    }

    try {
        await db.company.delete({
            where: { id: companyId }
        })

        revalidatePath("/admin/users/companies")
        return { success: true }
    } catch (error) {
        console.error("Error deleting company:", error)
        return { success: false, error: "Errore durante l'eliminazione dell'azienda" }
    }
}

export async function getCompanies() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        return []
    }

    try {
        return await db.company.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        })
    } catch (error) {
        console.error("Error fetching companies:", error)
        return []
    }
}
