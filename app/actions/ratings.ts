'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function submitRating(courseId: string, rating: number, comment: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

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
