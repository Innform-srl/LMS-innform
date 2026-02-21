"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PDFDownloadButton({ registerId }: { registerId: string }) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/lms/api/registers/${registerId}/pdf`)
            if (!response.ok) {
                const data = await response.json()
                alert(data.error || "Errore durante la generazione del PDF")
                return
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            const contentDisposition = response.headers.get("Content-Disposition")
            const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "registro.pdf"
            link.download = filename
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error downloading PDF:", error)
            alert("Errore durante il download del PDF")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleDownload} disabled={loading} size="sm">
            {loading ? "Generazione PDF..." : "Scarica PDF Registro"}
        </Button>
    )
}
