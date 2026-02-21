"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { syncElearningHours } from "@/app/actions/registers"

export function ElearningSync({ registerId }: { registerId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSync = async () => {
        setLoading(true)
        const result = await syncElearningHours(registerId)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.error)
        }
        setLoading(false)
    }

    return (
        <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
            {loading ? "Sincronizzazione..." : "Sync E-Learning"}
        </Button>
    )
}
