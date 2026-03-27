"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateEditionStatus } from "@/app/actions/editions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditionStatusManagerProps {
    editionId: string
    currentStatus: string
}

export function EditionStatusManager({ editionId, currentStatus }: EditionStatusManagerProps) {
    const [status, setStatus] = useState(currentStatus)
    const [isUpdating, setIsUpdating] = useState(false)
    const router = useRouter()

    const handleChange = async (newStatus: string) => {
        setIsUpdating(true)
        setStatus(newStatus)

        const result = await updateEditionStatus(editionId, newStatus)
        if (result.success) {
            toast.success("Stato aggiornato")
            router.refresh()
        } else {
            toast.error(result.error || "Errore")
            setStatus(currentStatus)
        }
        setIsUpdating(false)
    }

    return (
        <Select value={status} onValueChange={handleChange} disabled={isUpdating}>
            <SelectTrigger className="w-[180px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="planned">Pianificata</SelectItem>
                <SelectItem value="open">Aperta</SelectItem>
                <SelectItem value="in_progress">In Corso</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="cancelled">Annullata</SelectItem>
            </SelectContent>
        </Select>
    )
}
