import { db } from "@/lib/db";

/**
 * Bulk enroll multiple users into a course.
 * Uses createMany with skipDuplicates for new enrollments.
 * If editionId is provided, also updates existing enrollments to that edition.
 * Returns the number of new enrollments created + existing ones updated.
 */
export async function bulkEnrollUsers(userIds: string[], courseId: string, editionId?: string): Promise<number> {
    if (userIds.length === 0) return 0;

    // Create new enrollments (skip users already enrolled in this course)
    const created = await db.enrollment.createMany({
        data: userIds.map((userId) => ({
            userId,
            courseId,
            editionId: editionId || null,
            progress: 0,
            completed: false,
        })),
        skipDuplicates: true,
    });

    // If editionId provided, also update existing enrollments that don't have this edition
    let updated = 0;
    if (editionId) {
        const result = await db.enrollment.updateMany({
            where: {
                courseId,
                userId: { in: userIds },
                editionId: { not: editionId },
            },
            data: { editionId },
        });
        updated = result.count;
    }

    return created.count + updated;
}
