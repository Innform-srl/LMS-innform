"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
    className?: string
}

export function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
    className
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    return (
        <div className={cn("border rounded-lg bg-card text-card-foreground shadow-sm", className)}>
            <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
                <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle</span>
                </Button>
            </div>
            {isOpen && (
                <div className="p-6 pt-0 border-t">
                    <div className="pt-6">
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}
