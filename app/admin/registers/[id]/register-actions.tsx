"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateRegister } from "@/app/actions/registers"

interface RegisterActionsProps {
    register: {
        id: string
        status: string
    }
}

export function RegisterActions({ register }: RegisterActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleStatusChange = async (newStatus: "ACTIVE" | "CLOSED" | "DRAFT") => {
        const confirmMsg =
            newStatus === "CLOSED"
                ? "Sei sicuro di voler chiudere il registro? Non sara' piu' modificabile."
                : newStatus === "ACTIVE"
                    ? "Attivare il registro?"
                    : "Riportare il registro in bozza?"

        if (!confirm(confirmMsg)) return

        setLoading(true)
        const result = await updateRegister(register.id, { status: newStatus })
        if (!result.success) {
            alert(result.error)
        }
        setLoading(false)
        router.refresh()
    }

    return (
        <div className="flex gap-2">
            {register.status === "DRAFT" && (
                <Button
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={loading}
                    size="sm"
                >
                    Attiva Registro
                </Button>
            )}
            {register.status === "ACTIVE" && (
                <>
                    <Button
                        onClick={() => handleStatusChange("DRAFT")}
                        variant="outline"
                        disabled={loading}
                        size="sm"
                    >
                        Torna in Bozza
                    </Button>
                    <Button
                        onClick={() => handleStatusChange("CLOSED")}
                        variant="destructive"
                        disabled={loading}
                        size="sm"
                    >
                        Chiudi Registro
                    </Button>
                </>
            )}
        </div>
    )
}
