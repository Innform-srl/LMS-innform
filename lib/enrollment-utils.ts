import { db } from "@/lib/db"

/**
 * Bulk enroll multiple users into a course.
 * Uses createMany with skipDuplicates to safely handle re-enrollment.
 * Returns the number of new enrollments created.
 */
export async function bulkEnrollUsers(
    userIds: string[],
    courseId: string
): Promise<number> {
    if (userIds.length === 0) return 0

    const result = await db.enrollment.createMany({
        data: userIds.map(userId => ({
            userId,
            courseId,
            progress: 0,
            completed: false,
        })),
        skipDuplicates: true,
    })

    return result.count
}
