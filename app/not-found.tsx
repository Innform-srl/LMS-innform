import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <FileQuestion className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Pagina non trovata</h2>
                <p className="text-muted-foreground max-w-md">
                    La pagina che stai cercando non esiste o è stata spostata.
                </p>
            </div>
            <Button asChild>
                <Link href="/lms">Torna alla Dashboard</Link>
            </Button>
        </div>
    )
}
