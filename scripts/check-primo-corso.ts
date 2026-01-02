import { db } from '../lib/db'

async function checkPrimoCorso() {
    const course = await db.course.findFirst({
        where: { title: { contains: "PRIMO CORSO" } },
        include: {
            modules: {
                orderBy: { position: 'asc' }
            },
            enrollments: {
                include: {
                    user: {
                        select: { email: true, name: true }
                    }
                }
            }
        }
    })

    if (!course) {
        console.log("❌ Corso 'PRIMO CORSO' non trovato!")
        return
    }

    console.log("\n=== CORSO ===")
    console.log("Titolo:", course.title)
    console.log("ID:", course.id)
    console.log("Pubblicato:", course.published)

    console.log("\n=== MODULI ===")
    console.log("Totale moduli:", course.modules.length)

    if (course.modules.length === 0) {
        console.log("⚠️ NESSUN MODULO TROVATO!")
    } else {
        course.modules.forEach((mod, i) => {
            console.log(`\n${i + 1}. ${mod.title}`)
            console.log("   - ID:", mod.id)
            console.log("   - Pubblicato:", mod.published ? "✅ SI" : "❌ NO")
            console.log("   - Position:", mod.position)
            console.log("   - Video URL:", mod.videoUrl || "N/A")
        })
    }

    console.log("\n=== ISCRIZIONI ===")
    console.log("Totale iscrizioni:", course.enrollments.length)

    if (course.enrollments.length > 0) {
        course.enrollments.forEach((enr, i) => {
            console.log(`${i + 1}. ${enr.user.name} (${enr.user.email})`)
        })
    }

    // Check if modules need publishing
    const unpublishedModules = course.modules.filter(m => !m.published)
    if (unpublishedModules.length > 0) {
        console.log("\n⚠️ PROBLEMA TROVATO:")
        console.log(`${unpublishedModules.length} moduli NON pubblicati!`)
        console.log("\nEsegui lo script 'publish-primo-corso-modules.ts' per pubblicarli.")
    } else if (course.modules.length > 0) {
        console.log("\n✅ Tutti i moduli sono pubblicati!")
    }
}

checkPrimoCorso()
    .then(() => process.exit(0))
    .catch(console.error)
