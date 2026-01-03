"use client"

import { Button } from "@/components/ui/button"
import { approveUser } from "@/app/actions/users"
import { useToast } from "@/components/ui/use-toast"
import { Check } from "lucide-react"
import { useState } from "react"

export function ApproveUserButton({ userId }: { userId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handleApprove = async () => {
        setIsLoading(true)
        try {
            const result = await approveUser(userId)
            if (result.success) {
                toast({
                    title: "Successo",
                    description: "Utente approvato con successo",
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Errore durante l'approvazione",
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Errore imprevisto",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isLoading}
        >
            <Check className="w-4 h-4 mr-1" />
            Approva
        </Button>
    )
}
