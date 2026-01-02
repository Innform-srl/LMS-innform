"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
})

export async function registerUser(values: z.infer<typeof registerSchema>) {
    const validatedFields = registerSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, error: "Campi non validi" }
    }

    const { email, password, name } = validatedFields.data

    try {
        const existingUser = await db.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "Email già registrata" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                isApproved: false, // Explicitly set to false
                role: "EMPLOYEE"
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return { success: false, error: "Errore durante la registrazione" }
    }
}
