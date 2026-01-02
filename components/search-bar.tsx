"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"

export function SearchBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(searchParams.get("q") || "")
    const debouncedQuery = useDebounce(query, 500)

    useEffect(() => {
        if (debouncedQuery === searchParams.get("q")) return

        if (debouncedQuery) {
            const params = new URLSearchParams(searchParams)
            params.set("q", debouncedQuery)
            router.push(`/search?${params.toString()}`)
        } else if (query === "") {
            // Only clear if user explicitly cleared input
            // router.push('/search') // Optional: decide if clearing search goes to all results or stays
        }
    }, [debouncedQuery, router, searchParams])

    const handleClear = () => {
        setQuery("")
        router.push('/search')
    }

    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Cerca corsi..."
                className="pl-9 pr-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        router.push(`/search?q=${query}`)
                    }
                }}
            />
            {query && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                    onClick={handleClear}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
        </div>
    )
}
