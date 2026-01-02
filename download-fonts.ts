import fs from 'fs'
import path from 'path'
import https from 'https'

const fonts = [
    { name: 'Roboto-Regular.ttf', url: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf' },
    { name: 'Roboto-Bold.ttf', url: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf' }
]

const dir = path.join(process.cwd(), 'assets', 'fonts')
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
}

fonts.forEach(font => {
    const file = fs.createWriteStream(path.join(dir, font.name))
    https.get(font.url, response => {
        response.pipe(file)
        file.on('finish', () => {
            file.close()
            console.log(`Downloaded ${font.name}`)
        })
    }).on('error', err => {
        fs.unlink(path.join(dir, font.name), () => { })
        console.error(`Error downloading ${font.name}: ${err.message}`)
    })
})
