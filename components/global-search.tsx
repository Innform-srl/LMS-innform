"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, BookOpen, Loader2 } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { apiUrl } from "@/lib/api"

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const debouncedQuery = useDebounce(query, 300)
    const [data, setData] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (debouncedQuery.length === 0) {
            setData([])
            return
        }

        // AbortController to cancel previous requests when query changes
        const abortController = new AbortController()

        async function fetchResults() {
            setLoading(true)
            try {
                const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(debouncedQuery)}`), {
                    signal: abortController.signal
                })
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (error) {
                // Ignore abort errors
                if ((error as Error).name !== 'AbortError') {
                    console.error(error)
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        fetchResults()

        // Cleanup: abort request when query changes or component unmounts
        return () => abortController.abort()
    }, [debouncedQuery])

    const handleSelect = (id: string) => {
        setOpen(false)
        router.push(`/courses/${id}`)
    }

    return (
        <>
            <Button
                variant="outline"
                className={cn(
                    "relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80"
                )}
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Cerca corsi...</span>
                <span className="inline-flex lg:hidden">Cerca...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Scrivi per cercare..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            "Nessun risultato trovato."
                        )}
                    </CommandEmpty>
                    {data.length > 0 && (
                        <CommandGroup heading="Corsi">
                            {data.map((course) => (
                                <CommandItem
                                    key={course.id}
                                    value={course.title}
                                    onSelect={() => handleSelect(course.id)}
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    <span>{course.title}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    )
}
