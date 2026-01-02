import { db } from "@/lib/db"
import { createNotification } from "@/app/actions/notifications"

async function main() {
    const userEmail = "admin@innform.com"
    const user = await db.user.findUnique({ where: { email: userEmail } })

    if (!user) {
        console.error("User not found")
        return
    }

    console.log("Creating test notifications for", user.name)

    await createNotification(
        user.id,
        "Nuovo Corso Disponibile",
        "È stato pubblicato il nuovo corso 'Advanced React Patterns'. Iscriviti ora!",
        "NEW_COURSE",
        "/courses/advanced-react",
        "BookOpen"
    )

    await createNotification(
        user.id,
        "Scadenza Imminente",
        "Il corso 'GDPR Compliance' scade tra 3 giorni. Completalo per evitare sanzioni.",
        "DEADLINE_REMINDER",
        "/courses/gdpr",
        "Clock"
    )

    await createNotification(
        user.id,
        "Nuovo Commento",
        "Mario Rossi ha risposto al tuo commento nel modulo 'Introduzione'.",
        "COMMENT_REPLY",
        "/courses/intro/modules/1",
        "MessageCircle"
    )

    await createNotification(
        user.id,
        "Certificato Pronto",
        "Congratulazioni! Il tuo certificato per 'Cybersecurity Basics' è pronto per il download.",
        "CERTIFICATE_READY",
        "/certificates",
        "Award"
    )

    await createNotification(
        user.id,
        "Quiz Corretto",
        "Il tuo quiz finale è stato corretto. Hai ottenuto 85/100.",
        "QUIZ_GRADED",
        "/courses/quiz-results",
        "CheckCircle2"
    )

    console.log("Notifications created!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
