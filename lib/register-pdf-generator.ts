import PDFDocument from "pdfkit"

// ============ TYPES ============

interface RegisterPDFData {
    title: string
    registerType: "FUNDED" | "INTERNAL"
    courseName: string
    plannedHours: number
    complianceThreshold: number
    fundingBody?: string | null
    projectCode?: string | null
    editionCode?: string | null
    trainingLocation?: string | null
    entries: Array<{
        date: Date
        startTime: Date
        endTime: Date
        pauseMinutes: number
        effectiveHours: number
        topics: string
        deliveryMode: string
        instructors: Array<{ name: string; role: string; hoursDelivered: number }>
        attendances: Array<{
            participantName: string
            participantEmail: string
            fiscalCode?: string | null
            companyName?: string | null
            status: string
            hoursAttended?: number | null
            signedAt?: Date | null
        }>
    }>
    participants: Array<{
        name: string
        email: string
        fiscalCode?: string | null
        companyName?: string | null
        jobTitle?: string | null
        totalHours: number
        elearningHours: number
        isCompliant: boolean
    }>
    instructors: Array<{
        name: string
        role: string
        specialization?: string | null
        totalHours: number
    }>
}

interface PDFSettings {
    companyName: string
    primaryColor: string
    accentColor: string
}

// ============ HELPERS ============

function formatDateIT(date: Date): string {
    return new Date(date).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatTimeIT(date: Date): string {
    return new Date(date).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
    })
}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        PRESENT: "P",
        ATTENDED: "P",
        LATE: "R",
        ABSENT: "A",
        EXCUSED: "G",
        REGISTERED: "-",
    }
    return labels[status] || "-"
}

function deliveryLabel(mode: string): string {
    const labels: Record<string, string> = {
        IN_PERSON: "Aula",
        ONLINE: "Online",
        ELEARNING: "E-Learning",
    }
    return labels[mode] || mode
}

function roleLabel(role: string): string {
    const labels: Record<string, string> = {
        DOCENTE: "Docente",
        TUTOR: "Tutor",
        CODOCENTE: "Co-docente",
        ESPERTO: "Esperto",
    }
    return labels[role] || role
}

// ============ FUNDED REGISTER PDF ============

export async function generateFundedRegisterPDF(
    data: RegisterPDFData,
    settings: PDFSettings
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                layout: "landscape",
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
            })

            const buffers: Buffer[] = []
            doc.on("data", buffers.push.bind(buffers))
            doc.on("end", () => resolve(Buffer.concat(buffers)))
            doc.on("error", reject)

            const pageWidth = doc.page.width
            const pageHeight = doc.page.height
            const contentWidth = pageWidth - 80

            // ---- PAGE 1: COVER ----
            drawCover(doc, data, settings, pageWidth, pageHeight, contentWidth)

            // ---- DAILY ATTENDANCE PAGES ----
            for (const entry of data.entries) {
                doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
                drawDailyPage(doc, data, entry, settings, pageWidth, contentWidth)
            }

            // ---- SUMMARY PAGE ----
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawSummaryPage(doc, data, settings, pageWidth, contentWidth)

            // ---- INSTRUCTOR SUMMARY ----
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawInstructorSummary(doc, data, settings, pageWidth, contentWidth)

            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}

// ============ INTERNAL REGISTER PDF ============

export async function generateInternalRegisterPDF(
    data: RegisterPDFData,
    settings: PDFSettings
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                layout: "landscape",
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
            })

            const buffers: Buffer[] = []
            doc.on("data", buffers.push.bind(buffers))
            doc.on("end", () => resolve(Buffer.concat(buffers)))
            doc.on("error", reject)

            const pageWidth = doc.page.width
            const pageHeight = doc.page.height
            const contentWidth = pageWidth - 80

            // ---- COVER ----
            drawInternalCover(doc, data, settings, pageWidth, pageHeight, contentWidth)

            // ---- SUMMARY PAGE ----
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawInternalSummary(doc, data, settings, pageWidth, contentWidth)

            // ---- DAILY PAGES ----
            for (const entry of data.entries) {
                doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
                drawInternalDailyPage(doc, data, entry, settings, pageWidth, contentWidth)
            }

            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}

// ============ DRAWING FUNCTIONS ============

function drawPageHeader(doc: PDFKit.PDFDocument, title: string, settings: PDFSettings, pageWidth: number) {
    doc
        .rect(40, 20, pageWidth - 80, 2)
        .fill(settings.primaryColor)

    doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(settings.primaryColor)
        .text(title, 40, 28, { width: pageWidth - 80, align: "left" })

    doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#666666")
        .text(settings.companyName, 40, 28, { width: pageWidth - 80, align: "right" })
}

function drawCover(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    settings: PDFSettings,
    pageWidth: number,
    pageHeight: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _contentWidth: number
) {
    // Border
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(2).stroke(settings.primaryColor)
    doc.rect(35, 35, pageWidth - 70, pageHeight - 70).lineWidth(0.5).stroke(settings.accentColor)

    let y = 80

    // Title
    doc.fontSize(12).font("Helvetica").fillColor("#666666").text("REGISTRO PRESENZE", 0, y, { align: "center", width: pageWidth })
    y += 25

    doc.fontSize(24).font("Helvetica-Bold").fillColor(settings.primaryColor).text(data.title, 0, y, { align: "center", width: pageWidth })
    y += 45

    // Decorative line
    doc.moveTo(pageWidth / 2 - 80, y).lineTo(pageWidth / 2 + 80, y).lineWidth(1).stroke(settings.accentColor)
    y += 30

    // Details table
    const leftCol = 200
    const rightCol = leftCol + 180

    const details = [
        ["Corso:", data.courseName],
        ["Ente Finanziatore:", data.fundingBody || "-"],
        ["Codice Progetto:", data.projectCode || "-"],
        ["Codice Edizione:", data.editionCode || "-"],
        ["Sede Formativa:", data.trainingLocation || "-"],
        ["Ore Previste:", `${data.plannedHours}h`],
        ["Soglia Frequenza:", `${data.complianceThreshold}%`],
        ["N. Partecipanti:", `${data.participants.length}`],
        ["N. Giornate:", `${data.entries.length}`],
    ]

    for (const [label, value] of details) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#333333").text(label, leftCol, y)
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(value, rightCol, y)
        y += 20
    }

    // Footer
    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#666666")
        .text(
            `Documento generato il ${formatDateIT(new Date())} - ${settings.companyName}`,
            0,
            pageHeight - 60,
            { align: "center", width: pageWidth }
        )
}

function drawDailyPage(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    entry: RegisterPDFData["entries"][0],
    settings: PDFSettings,
    pageWidth: number,
    contentWidth: number
) {
    drawPageHeader(doc, "REGISTRO PRESENZE GIORNALIERO", settings, pageWidth)

    let y = 50

    // Day header
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000")
        .text(`Giornata del ${formatDateIT(entry.date)}`, 40, y)
    y += 22

    doc.fontSize(9).font("Helvetica").fillColor("#333333")
        .text(
            `Orario: ${formatTimeIT(entry.startTime)} - ${formatTimeIT(entry.endTime)}` +
            (entry.pauseMinutes > 0 ? ` | Pausa: ${entry.pauseMinutes} min` : "") +
            ` | Ore effettive: ${entry.effectiveHours}h` +
            ` | Modalita': ${deliveryLabel(entry.deliveryMode)}`,
            40, y
        )
    y += 18

    if (entry.instructors.length > 0) {
        doc.text(
            `Docente/i: ${entry.instructors.map((i) => `${i.name} (${roleLabel(i.role)}, ${i.hoursDelivered}h)`).join(", ")}`,
            40, y
        )
        y += 18
    }

    y += 5

    // Attendance table
    const cols = data.registerType === "FUNDED"
        ? [
            { label: "N.", width: 25, align: "center" as const },
            { label: "Cognome e Nome", width: 150, align: "left" as const },
            { label: "Codice Fiscale", width: 120, align: "left" as const },
            { label: "Azienda", width: 100, align: "left" as const },
            { label: "Firma Ingresso", width: 90, align: "center" as const },
            { label: "Firma Uscita", width: 90, align: "center" as const },
            { label: "Ore", width: 40, align: "center" as const },
            { label: "Note", width: contentWidth - 615, align: "left" as const },
        ]
        : [
            { label: "N.", width: 25, align: "center" as const },
            { label: "Cognome e Nome", width: 180, align: "left" as const },
            { label: "Stato", width: 40, align: "center" as const },
            { label: "Firma Ingresso", width: 100, align: "center" as const },
            { label: "Firma Uscita", width: 100, align: "center" as const },
            { label: "Ore", width: 40, align: "center" as const },
            { label: "Note", width: contentWidth - 485, align: "left" as const },
        ]

    // Table header
    let x = 40
    doc.rect(40, y, contentWidth, 16).fill("#f0f0f0")
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#333333")
    for (const col of cols) {
        doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align })
        x += col.width
    }
    y += 16

    // Table rows
    const participantAttendanceMap = new Map(
        entry.attendances.map((a) => [a.participantEmail, a])
    )

    doc.fontSize(7).font("Helvetica").fillColor("#000000")

    for (let i = 0; i < data.participants.length; i++) {
        const p = data.participants[i]
        const att = participantAttendanceMap.get(p.email)

        if (y > doc.page.height - 80) {
            // Footer on current page
            drawDailyFooter(doc, entry, settings, pageWidth)
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawPageHeader(doc, "REGISTRO PRESENZE GIORNALIERO (continua)", settings, pageWidth)
            y = 55
        }

        if (i % 2 === 0) {
            doc.rect(40, y, contentWidth, 14).fill("#fafafa")
            doc.fillColor("#000000")
        }

        x = 40
        const rowData = data.registerType === "FUNDED"
            ? [
                (i + 1).toString(),
                p.name || p.email,
                p.fiscalCode || "",
                p.companyName || "",
                att?.signedAt ? formatTimeIT(att.signedAt) : "________________",
                att?.signedAt ? formatTimeIT(att.signedAt) : "________________",
                att?.hoursAttended?.toString() ?? entry.effectiveHours.toString(),
                att?.status ? statusLabel(att.status) : "",
            ]
            : [
                (i + 1).toString(),
                p.name || p.email,
                att ? statusLabel(att.status) : "-",
                att?.signedAt ? formatTimeIT(att.signedAt) : "________________",
                att?.signedAt ? formatTimeIT(att.signedAt) : "________________",
                att?.hoursAttended?.toString() ?? entry.effectiveHours.toString(),
                "",
            ]

        for (let c = 0; c < cols.length; c++) {
            doc.text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
            x += cols[c].width
        }
        y += 14
    }

    // Table border
    doc.rect(40, y - data.participants.length * 14 - 16, contentWidth, data.participants.length * 14 + 16)
        .lineWidth(0.5).stroke("#cccccc")

    drawDailyFooter(doc, entry, settings, pageWidth)
}

function drawDailyFooter(
    doc: PDFKit.PDFDocument,
    entry: RegisterPDFData["entries"][0],
    settings: PDFSettings,
    pageWidth: number
) {
    const footerY = doc.page.height - 70

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333")
        .text("Argomenti trattati:", 40, footerY)
    doc.fontSize(7).font("Helvetica").fillColor("#000000")
        .text(entry.topics, 40, footerY + 12, { width: pageWidth - 350 })

    if (entry.instructors.length > 0) {
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333")
            .text("Firma Docente:", pageWidth - 280, footerY)
        doc.fontSize(8).font("Helvetica").fillColor("#000000")
            .text(entry.instructors[0].name, pageWidth - 280, footerY + 14)
        doc.moveTo(pageWidth - 280, footerY + 35).lineTo(pageWidth - 100, footerY + 35).lineWidth(0.5).stroke("#999999")
    }
}

function drawSummaryPage(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    settings: PDFSettings,
    pageWidth: number,
    contentWidth: number
) {
    drawPageHeader(doc, "RIEPILOGO MONTE ORE PARTECIPANTI", settings, pageWidth)

    let y = 55

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000")
        .text("Riepilogo Frequenza", 40, y)
    y += 25

    // Summary table columns
    const cols = data.registerType === "FUNDED"
        ? [
            { label: "N.", width: 25, align: "center" as const },
            { label: "Cognome e Nome", width: 140, align: "left" as const },
            { label: "Codice Fiscale", width: 110, align: "left" as const },
            { label: "Azienda", width: 100, align: "left" as const },
            { label: "Ore Aula", width: 55, align: "center" as const },
            { label: "Ore E-Learn", width: 60, align: "center" as const },
            { label: "Ore Totali", width: 55, align: "center" as const },
            { label: "% Freq.", width: 45, align: "center" as const },
            { label: "Esito", width: contentWidth - 590, align: "center" as const },
        ]
        : [
            { label: "N.", width: 25, align: "center" as const },
            { label: "Cognome e Nome", width: 180, align: "left" as const },
            { label: "Azienda", width: 120, align: "left" as const },
            { label: "Ore Aula", width: 60, align: "center" as const },
            { label: "Ore E-Learn", width: 65, align: "center" as const },
            { label: "Ore Totali", width: 60, align: "center" as const },
            { label: "% Freq.", width: 50, align: "center" as const },
            { label: "Esito", width: contentWidth - 560, align: "center" as const },
        ]

    // Header
    let x = 40
    doc.rect(40, y, contentWidth, 16).fill("#f0f0f0")
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#333333")
    for (const col of cols) {
        doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align })
        x += col.width
    }
    y += 16

    // Rows
    doc.fontSize(7).font("Helvetica").fillColor("#000000")
    for (let i = 0; i < data.participants.length; i++) {
        const p = data.participants[i]
        const total = p.totalHours + p.elearningHours
        const pct = data.plannedHours > 0 ? Math.round((total / data.plannedHours) * 100) : 0

        if (y > doc.page.height - 80) {
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawPageHeader(doc, "RIEPILOGO MONTE ORE (continua)", settings, pageWidth)
            y = 55
        }

        if (i % 2 === 0) {
            doc.rect(40, y, contentWidth, 14).fill("#fafafa")
            doc.fillColor("#000000")
        }

        x = 40
        const rowData = data.registerType === "FUNDED"
            ? [
                (i + 1).toString(),
                p.name || p.email,
                p.fiscalCode || "",
                p.companyName || "",
                p.totalHours.toString(),
                p.elearningHours.toString(),
                total.toString(),
                `${pct}%`,
                p.isCompliant ? "IDONEO" : "NON IDONEO",
            ]
            : [
                (i + 1).toString(),
                p.name || p.email,
                p.companyName || "",
                p.totalHours.toString(),
                p.elearningHours.toString(),
                total.toString(),
                `${pct}%`,
                p.isCompliant ? "IDONEO" : "NON IDONEO",
            ]

        for (let c = 0; c < cols.length; c++) {
            if (c === cols.length - 1) {
                // Esito with color
                doc.font("Helvetica-Bold")
                    .fillColor(p.isCompliant ? "#16a34a" : "#dc2626")
                    .text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
                doc.font("Helvetica").fillColor("#000000")
            } else {
                doc.text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
            }
            x += cols[c].width
        }
        y += 14
    }

    // Totals row
    y += 10
    const compliantCount = data.participants.filter((p) => p.isCompliant).length
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000")
        .text(
            `Totale partecipanti: ${data.participants.length} | Idonei: ${compliantCount} | Non idonei: ${data.participants.length - compliantCount}`,
            40, y
        )

    // Signature area
    y += 40
    doc.fontSize(9).font("Helvetica").fillColor("#333333")
        .text("Firma Responsabile Formazione:", 40, y)
    doc.moveTo(220, y + 25).lineTo(420, y + 25).lineWidth(0.5).stroke("#999999")

    doc.text("Data:", pageWidth - 280, y)
    doc.moveTo(pageWidth - 240, y + 25).lineTo(pageWidth - 100, y + 25).lineWidth(0.5).stroke("#999999")
}

function drawInstructorSummary(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    settings: PDFSettings,
    pageWidth: number,
    contentWidth: number
) {
    drawPageHeader(doc, "RIEPILOGO ORE DOCENTI", settings, pageWidth)

    let y = 55

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000")
        .text("Riepilogo Docenti e Tutor", 40, y)
    y += 25

    const cols = [
        { label: "N.", width: 30, align: "center" as const },
        { label: "Nome", width: 180, align: "left" as const },
        { label: "Ruolo", width: 80, align: "center" as const },
        { label: "Specializzazione", width: 180, align: "left" as const },
        { label: "Ore Erogate", width: 80, align: "center" as const },
        { label: "Firma", width: contentWidth - 550, align: "center" as const },
    ]

    // Header
    let x = 40
    doc.rect(40, y, contentWidth, 16).fill("#f0f0f0")
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333")
    for (const col of cols) {
        doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align })
        x += col.width
    }
    y += 16

    // Rows
    doc.fontSize(8).font("Helvetica").fillColor("#000000")
    for (let i = 0; i < data.instructors.length; i++) {
        const inst = data.instructors[i]

        if (i % 2 === 0) {
            doc.rect(40, y, contentWidth, 18).fill("#fafafa")
            doc.fillColor("#000000")
        }

        x = 40
        const rowData = [
            (i + 1).toString(),
            inst.name,
            roleLabel(inst.role),
            inst.specialization || "-",
            `${inst.totalHours}h`,
            "________________",
        ]

        for (let c = 0; c < cols.length; c++) {
            doc.text(rowData[c], x + 2, y + 5, { width: cols[c].width - 4, align: cols[c].align })
            x += cols[c].width
        }
        y += 18
    }

    // Total
    y += 10
    const totalHours = data.instructors.reduce((s, i) => s + i.totalHours, 0)
    doc.fontSize(9).font("Helvetica-Bold")
        .text(`Totale ore erogate: ${Math.round(totalHours * 10) / 10}h`, 40, y)
}

// ============ INTERNAL REGISTER DRAWING ============

function drawInternalCover(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    settings: PDFSettings,
    pageWidth: number,
    pageHeight: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _contentWidth: number
) {
    doc.rect(35, 35, pageWidth - 70, pageHeight - 70).lineWidth(1).stroke(settings.primaryColor)

    let y = 100

    doc.fontSize(10).font("Helvetica").fillColor("#666666")
        .text(settings.companyName, 0, y, { align: "center", width: pageWidth })
    y += 30

    doc.fontSize(22).font("Helvetica-Bold").fillColor(settings.primaryColor)
        .text("Registro Formazione Interna", 0, y, { align: "center", width: pageWidth })
    y += 40

    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000000")
        .text(data.courseName, 0, y, { align: "center", width: pageWidth })
    y += 40

    doc.moveTo(pageWidth / 2 - 60, y).lineTo(pageWidth / 2 + 60, y).lineWidth(1).stroke(settings.accentColor)
    y += 30

    const details = [
        ["Sede:", data.trainingLocation || "-"],
        ["Ore previste:", `${data.plannedHours}h`],
        ["Partecipanti:", `${data.participants.length}`],
        ["Giornate:", `${data.entries.length}`],
    ]

    const leftCol = pageWidth / 2 - 100
    for (const [label, value] of details) {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text(label, leftCol, y)
        doc.fontSize(11).font("Helvetica").fillColor("#000000").text(value, leftCol + 120, y)
        y += 22
    }

    doc.fontSize(9).font("Helvetica").fillColor("#666666")
        .text(`Generato il ${formatDateIT(new Date())}`, 0, pageHeight - 60, { align: "center", width: pageWidth })
}

function drawInternalSummary(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    settings: PDFSettings,
    pageWidth: number,
    contentWidth: number
) {
    drawPageHeader(doc, "RIEPILOGO FORMAZIONE", settings, pageWidth)

    let y = 55

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("Monte Ore Partecipanti", 40, y)
    y += 25

    const cols = [
        { label: "N.", width: 25, align: "center" as const },
        { label: "Nome", width: 180, align: "left" as const },
        { label: "Azienda", width: 120, align: "left" as const },
        { label: "Qualifica", width: 100, align: "left" as const },
        { label: "Ore Aula", width: 55, align: "center" as const },
        { label: "Ore Online", width: 55, align: "center" as const },
        { label: "Totale", width: 55, align: "center" as const },
        { label: "Esito", width: contentWidth - 590, align: "center" as const },
    ]

    let x = 40
    doc.rect(40, y, contentWidth, 16).fill("#f0f0f0")
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#333333")
    for (const col of cols) {
        doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align })
        x += col.width
    }
    y += 16

    doc.fontSize(7).font("Helvetica").fillColor("#000000")
    for (let i = 0; i < data.participants.length; i++) {
        const p = data.participants[i]
        const total = p.totalHours + p.elearningHours

        if (y > doc.page.height - 60) {
            doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } })
            drawPageHeader(doc, "RIEPILOGO (continua)", settings, pageWidth)
            y = 55
        }

        if (i % 2 === 0) {
            doc.rect(40, y, contentWidth, 14).fill("#fafafa")
            doc.fillColor("#000000")
        }

        x = 40
        const rowData = [
            (i + 1).toString(),
            p.name || p.email,
            p.companyName || "",
            p.jobTitle || "",
            p.totalHours.toString(),
            p.elearningHours.toString(),
            total.toString(),
            p.isCompliant ? "Completato" : "In corso",
        ]

        for (let c = 0; c < cols.length; c++) {
            if (c === cols.length - 1) {
                doc.font("Helvetica-Bold")
                    .fillColor(p.isCompliant ? "#16a34a" : "#f59e0b")
                    .text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
                doc.font("Helvetica").fillColor("#000000")
            } else {
                doc.text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
            }
            x += cols[c].width
        }
        y += 14
    }
}

function drawInternalDailyPage(
    doc: PDFKit.PDFDocument,
    data: RegisterPDFData,
    entry: RegisterPDFData["entries"][0],
    settings: PDFSettings,
    pageWidth: number,
    contentWidth: number
) {
    drawPageHeader(doc, `PRESENZE - ${formatDateIT(entry.date)}`, settings, pageWidth)

    let y = 50

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000")
        .text(`${formatDateIT(entry.date)} - ${deliveryLabel(entry.deliveryMode)}`, 40, y)
    y += 18

    doc.fontSize(9).font("Helvetica").fillColor("#333333")
        .text(`${formatTimeIT(entry.startTime)} - ${formatTimeIT(entry.endTime)} | ${entry.effectiveHours}h effettive`, 40, y)
    y += 14

    if (entry.instructors.length > 0) {
        doc.text(`Docente: ${entry.instructors.map((i) => i.name).join(", ")}`, 40, y)
        y += 14
    }

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333").text("Argomenti:", 40, y)
    doc.fontSize(8).font("Helvetica").fillColor("#000000").text(entry.topics, 100, y, { width: contentWidth - 60 })
    y += Math.max(14, Math.ceil(entry.topics.length / 100) * 12) + 8

    // Simple attendance list
    const cols = [
        { label: "N.", width: 25, align: "center" as const },
        { label: "Nome", width: 200, align: "left" as const },
        { label: "Stato", width: 50, align: "center" as const },
        { label: "Ore", width: 50, align: "center" as const },
        { label: "Firma", width: contentWidth - 325, align: "center" as const },
    ]

    let x = 40
    doc.rect(40, y, contentWidth, 14).fill("#f0f0f0")
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#333333")
    for (const col of cols) {
        doc.text(col.label, x + 2, y + 3, { width: col.width - 4, align: col.align })
        x += col.width
    }
    y += 14

    const attMap = new Map(entry.attendances.map((a) => [a.participantEmail, a]))
    doc.fontSize(7).font("Helvetica").fillColor("#000000")

    for (let i = 0; i < data.participants.length; i++) {
        const p = data.participants[i]
        const att = attMap.get(p.email)

        if (y > doc.page.height - 60) break

        if (i % 2 === 0) {
            doc.rect(40, y, contentWidth, 13).fill("#fafafa")
            doc.fillColor("#000000")
        }

        x = 40
        const rowData = [
            (i + 1).toString(),
            p.name || p.email,
            att ? statusLabel(att.status) : "-",
            att?.hoursAttended?.toString() ?? (att ? entry.effectiveHours.toString() : "-"),
            att?.signedAt ? "Firmato" : "________________",
        ]

        for (let c = 0; c < cols.length; c++) {
            doc.text(rowData[c], x + 2, y + 3, { width: cols[c].width - 4, align: cols[c].align })
            x += cols[c].width
        }
        y += 13
    }
}
