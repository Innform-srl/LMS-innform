"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { exportRegisterCSV } from "@/app/actions/registers"

export function ExportButton({ registerId }: { registerId: string }) {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        setLoading(true)
        const result = await exportRegisterCSV(registerId)
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = result.filename || "registro.csv"
            link.click()
            URL.revokeObjectURL(url)
        } else {
            alert(result.error || "Errore durante l'export")
        }
        setLoading(false)
    }

    return (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            {loading ? "Export..." : "Export CSV"}
        </Button>
    )
}
