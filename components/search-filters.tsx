"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Department {
    id: string
    name: string
}

export function SearchFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [departments, setDepartments] = useState<Department[]>([])

    // Filter states
    const [selectedDept, setSelectedDept] = useState(searchParams.get("departmentId") || "all")
    const [durationRange, setDurationRange] = useState([
        parseInt(searchParams.get("minDuration") || "0"),
        parseInt(searchParams.get("maxDuration") || "120")
    ])
    const [sort, setSort] = useState(searchParams.get("sort") || "newest")

    useEffect(() => {
        // Fetch departments
        fetch('/api/departments') // Assuming this endpoint exists or I need to create it
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(err => console.error(err))
    }, [])

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams)

        if (selectedDept && selectedDept !== "all") {
            params.set("departmentId", selectedDept)
        } else {
            params.delete("departmentId")
        }

        if (durationRange[0] > 0) {
            params.set("minDuration", durationRange[0].toString())
        } else {
            params.delete("minDuration")
        }

        if (durationRange[1] < 120) { // Assuming 120 is max for slider
            params.set("maxDuration", durationRange[1].toString())
        } else {
            params.delete("maxDuration")
        }

        if (sort !== "newest") {
            params.set("sort", sort)
        } else {
            params.delete("sort")
        }

        router.push(`/search?${params.toString()}`)
    }

    const clearFilters = () => {
        setSelectedDept("all")
        setDurationRange([0, 120])
        setSort("newest")
        router.push('/search')
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-4">Filtri</h3>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Ordina per</Label>
                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ordina per..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Più recenti</SelectItem>
                                <SelectItem value="oldest">Meno recenti</SelectItem>
                                <SelectItem value="title-asc">Titolo (A-Z)</SelectItem>
                                <SelectItem value="title-desc">Titolo (Z-A)</SelectItem>
                                <SelectItem value="duration-asc">Durata (Minore)</SelectItem>
                                <SelectItem value="duration-desc">Durata (Maggiore)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Dipartimento</Label>
                        <RadioGroup value={selectedDept} onValueChange={setSelectedDept}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all">Tutti</Label>
                            </div>
                            {departments.map(dept => (
                                <div key={dept.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={dept.id} id={dept.id} />
                                    <Label htmlFor={dept.id}>{dept.name}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label>Durata (minuti)</Label>
                        <Slider
                            defaultValue={[0, 120]}
                            value={durationRange}
                            max={120}
                            step={10}
                            onValueChange={setDurationRange}
                            className="py-4"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{durationRange[0]}m</span>
                            <span>{durationRange[1]}m+</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button onClick={applyFilters} className="flex-1">Applica</Button>
                        <Button variant="outline" onClick={clearFilters} className="flex-1">Reset</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
