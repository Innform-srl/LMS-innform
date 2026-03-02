'use server'

import { requireAuth } from "@/lib/permissions"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function submitRating(courseId: string, rating: number, comment: string) {
    const check = await requireAuth()
    if (!check.authorized) throw new Error(check.error)
    const session = check.session

    await db.courseRating.upsert({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId
            }
        },
        update: {
            rating,
            comment
        },
        create: {
            userId: session.user.id,
            courseId,
            rating,
            comment
        }
    })

    revalidatePath(`/courses/${courseId}`)
}
