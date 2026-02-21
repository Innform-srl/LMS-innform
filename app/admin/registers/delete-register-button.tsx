"use client"

import { Button } from "@/components/ui/button"
import { deleteRegister } from "@/app/actions/registers"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function DeleteRegisterButton({ registerId }: { registerId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm("Sei sicuro di voler eliminare questo registro?")) return
        setLoading(true)
        const result = await deleteRegister(registerId)
        if (!result.success) {
            alert(result.error)
        }
        setLoading(false)
        router.refresh()
    }

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? "..." : "Elimina"}
        </Button>
    )
}
