import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { QuizInterface } from "./quiz-interface"

export default async function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const { quizId } = await params

    const quiz = await db.quiz.findUnique({
        where: { id: quizId },
        include: {
            module: {
                include: {
                    course: true
                }
            },
            questions: {
                orderBy: { position: "asc" },
                select: {
                    id: true,
                    question: true,
                    type: true,
                    explanation: true,
                    options: true,
                    position: true,
                    points: true
                }
            }
        }
    })

    if (!quiz) {
        return <div className="p-8">Quiz non trovato</div>
    }

    // Quiz limit removed as per user request
    // const canTake = await canTakeQuiz(quizId)
    // if (!canTake.canTake) { ... }

    const enrollment = await db.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: quiz.module.courseId
            }
        }
    })

    if (!enrollment) redirect("/courses")

    return (
        <QuizInterface
            quiz={quiz}
            courseId={quiz.module.courseId}
            attempts={0} // No limit tracking needed for UI blocking
            maxAttempts={Infinity}
            enrollment={enrollment}
            moduleId={quiz.module.id}
            moduleTitle={quiz.module.title}
            courseTitle={quiz.module.course.title}
            courseMinDuration={quiz.module.course.minimumDuration}
            moduleMinDuration={quiz.module.minimumDuration || 0}
        />
    )
}
