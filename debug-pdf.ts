import PDFDocument from 'pdfkit'
import fs from 'fs'

async function loadFont(type: 'regular' | 'bold' = 'regular'): Promise<ArrayBuffer> {
    const url = type === 'bold'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf'
        : 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf'

    console.log(`Fetching ${url}...`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load font: ${response.statusText}`)
    return await response.arrayBuffer()
}

async function testPdf() {
    try {
        console.log("Loading fonts...")
        const fontBuffer = await loadFont('regular')
        console.log("Font loaded, size:", fontBuffer.byteLength)

        const doc = new PDFDocument()

        try {
            console.log("Registering font as ArrayBuffer...")
            // @ts-ignore
            doc.registerFont('Roboto', fontBuffer)
            console.log("Registered as ArrayBuffer success")
        } catch (e) {
            console.log("Failed as ArrayBuffer:", e)

            console.log("Converting to Buffer...")
            const nodeBuffer = Buffer.from(fontBuffer)
            doc.registerFont('Roboto', nodeBuffer)
            console.log("Registered as Buffer success")
        }

        doc.font('Roboto').fontSize(20).text('Hello World', 100, 100)
        doc.end()
        console.log("PDF generated successfully")
    } catch (error) {
        console.error("Test failed:", error)
    }
}

testPdf()
