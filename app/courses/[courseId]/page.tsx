import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { CoursePlayer } from "./course-player"
import { CourseRating } from "@/components/course-rating"

export default async function CoursePlayerPage({ params }: { params: Promise<{ courseId: string }> }) {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const { courseId } = await params

    const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                where: { published: true },
                orderBy: { position: "asc" },
                include: {
                    quiz: true,
                    liveSession: true
                }
            }
        }
    })

    if (!course) return redirect("/courses")

    const enrollment = await db.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: course.id
            }
        },
        include: {
            certificate: true
        }
    })

    if (!enrollment) return redirect(`/courses/${course.id}/enroll`)

    // Get completed modules
    const moduleProgress = await db.moduleProgress.findMany({
        where: {
            userId: session.user.id,
            moduleId: { in: course.modules.map(m => m.id) },
            completed: true
        },
        select: { moduleId: true }
    })

    const completedModuleIds = new Set(moduleProgress.map(mp => mp.moduleId))

    const userRating = await db.courseRating.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId
            }
        }
    })

    return (
        <div className="min-h-screen bg-gray-900">
            <CoursePlayer
                course={course}
                modules={course.modules}
                enrollment={enrollment}
                completedModuleIds={Array.from(completedModuleIds)}
                userName={session.user.name || session.user.email || 'Studente'}
                userId={session.user.id}
            />

            <div className="max-w-4xl mx-auto px-6 py-12">
                <CourseRating
                    courseId={course.id}
                    initialRating={userRating?.rating}
                    initialComment={userRating?.comment || ""}
                />
            </div>
        </div>
    )
}
