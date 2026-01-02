import { db } from "./lib/db"

async function updateQuizAttempts() {
    try {
        console.log("Updating quiz attempts limit...")
        const result = await db.quiz.updateMany({
            data: {
                maxAttempts: 10
            }
        })
        console.log(`Updated ${result.count} quizzes to 10 max attempts.`)
    } catch (error) {
        console.error("Error updating quizzes:", error)
    }
}

updateQuizAttempts()
