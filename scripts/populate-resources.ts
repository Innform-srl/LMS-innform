import { db } from '../lib/db'

async function populateResources() {
    console.log('📚 Populating Resources Library...\n')

    const resources = [
        {
            title: "Manuale Sicurezza Ufficio",
            description: "Guida completa alle procedure di sicurezza in ambiente d'ufficio.",
            fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "PDF",
            size: 1024 * 1024 * 2 // 2MB
        },
        {
            title: "Regolamento Aziendale 2024",
            description: "Norme comportamentali e policy aziendali aggiornate.",
            fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "PDF",
            size: 1024 * 500 // 500KB
        },
        {
            title: "Guida Utilizzo LMS",
            description: "Istruzioni passo-passo per navigare e utilizzare la piattaforma formativa.",
            fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "PDF",
            size: 1024 * 1024 * 1.5 // 1.5MB
        },
        {
            title: "Template Richiesta Ferie",
            description: "Modulo standard per la richiesta di ferie e permessi.",
            fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "DOCX",
            size: 1024 * 200 // 200KB
        },
        {
            title: "Procedura Smart Working",
            description: "Linee guida per il lavoro agile e la connessione remota.",
            fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "PDF",
            size: 1024 * 800 // 800KB
        }
    ]

    try {
        for (const res of resources) {
            // Check if exists to avoid duplicates
            const existing = await db.resource.findFirst({
                where: { title: res.title }
            })

            if (!existing) {
                await db.resource.create({
                    data: res
                })
                console.log(`✅ Added resource: ${res.title}`)
            } else {
                console.log(`⚠️  Skipped existing: ${res.title}`)
            }
        }

        console.log('\n🎉 Resources library populated successfully!')

    } catch (error) {
        console.error('❌ Error populating resources:', error)
    }
}

populateResources()
    .then(() => process.exit(0))
    .catch(console.error)
