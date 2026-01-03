import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { SearchFilters } from "@/components/search-filters"
import { CourseCard } from "@/components/course-card"
import { SearchBar } from "@/components/search-bar"
import { redirect } from "next/navigation"

interface SearchPageProps {
    searchParams: Promise<{
        q?: string
        departmentId?: string
        minDuration?: string
        maxDuration?: string
        sort?: string
    }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const session = await auth()
    if (!session?.user) {
        redirect("/login")
    }

    const params = await searchParams
    const query = params.q
    const departmentId = params.departmentId
    const minDuration = params.minDuration
    const maxDuration = params.maxDuration
    const sort = params.sort || "newest"

    const whereClause: Prisma.CourseWhereInput = {
        published: true,
        AND: []
    }

    if (query) {
        (whereClause.AND as Prisma.CourseWhereInput[]).push({
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        })
    }

    if (departmentId && departmentId !== "all") {
        (whereClause.AND as Prisma.CourseWhereInput[]).push({
            departmentId: departmentId
        })
    }

    if (minDuration) {
        (whereClause.AND as Prisma.CourseWhereInput[]).push({
            minimumDuration: { gte: parseInt(minDuration) }
        })
    }
    if (maxDuration) {
        (whereClause.AND as Prisma.CourseWhereInput[]).push({
            minimumDuration: { lte: parseInt(maxDuration) }
        })
    }

    let orderBy: Prisma.CourseOrderByWithRelationInput = { createdAt: 'desc' }
    switch (sort) {
        case 'oldest':
            orderBy = { createdAt: 'asc' }
            break
        case 'title-asc':
            orderBy = { title: 'asc' }
            break
        case 'title-desc':
            orderBy = { title: 'desc' }
            break
        case 'duration-asc':
            orderBy = { minimumDuration: 'asc' }
            break
        case 'duration-desc':
            orderBy = { minimumDuration: 'desc' }
            break
    }

    const courses = await db.course.findMany({
        where: whereClause,
        orderBy,
        include: {
            department: true,
            _count: {
                select: {
                    modules: true,
                    enrollments: true
                }
            }
        }
    })

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 shrink-0 space-y-6">
                    <div className="sticky top-20">
                        <SearchFilters />
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Ricerca</h1>
                            <p className="text-muted-foreground">
                                {courses.length} risultati trovati {query && `per "${query}"`}
                            </p>
                        </div>
                        <SearchBar />
                    </div>

                    {courses.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                            <h3 className="text-lg font-semibold mb-2">Nessun risultato trovato</h3>
                            <p className="text-muted-foreground">
                                Prova a modificare i filtri o la ricerca.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    progress={null} // Search results don't show progress context usually, or fetch it if needed
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
