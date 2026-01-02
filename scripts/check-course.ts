import { db } from '../lib/db'

async function checkCourse() {
    const course = await db.course.findFirst({
        where: { title: { contains: "COMPETENZE DIGITALI" } },
        include: {
            modules: {
                orderBy: { position: 'asc' }
            },
            enrollments: true
        }
    })

    if (!course) {
        console.log("Corso non trovato!")
        return
    }

    console.log("\n=== CORSO ===")
    console.log("Titolo:", course.title)
    console.log("ID:", course.id)
    console.log("Pubblicato:", course.published)

    console.log("\n=== MODULI ===")
    console.log("Totale moduli:", course.modules.length)
    course.modules.forEach((mod, i) => {
        console.log(`\n${i + 1}. ${mod.title}`)
        console.log("   - ID:", mod.id)
        console.log("   - Pubblicato:", mod.published)
        console.log("   - Position:", mod.position)
    })

    console.log("\n=== ISCRIZIONI ===")
    console.log("Totale iscrizioni:", course.enrollments.length)
    if (course.enrollments.length === 0) {
        console.log("⚠️ NESSUNA ISCRIZIONE - Questo è probabilmente il problema!")
    }
}

checkCourse()
    .then(() => process.exit(0))
    .catch(console.error)
