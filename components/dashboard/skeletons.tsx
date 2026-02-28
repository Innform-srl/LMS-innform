
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="glass border-border">
                    <CardHeader className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}

export function SessionsSkeleton() {
    return (
        <Card className="glass border-border">
            <CardHeader>
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="bg-background/50 border-border">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                                <div className="h-9 w-full bg-muted rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export function NewsSkeleton() {
    return (
        <Card className="glass border-border">
            <CardHeader>
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-56 bg-muted rounded animate-pulse mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                        <div className="w-9 h-9 bg-muted rounded-lg animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                            <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export function CourseListSkeleton() {
    return (
        <div className="mb-12">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="glass border-border card-hover">
                        <CardHeader className="space-y-2">
                            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                            <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-full bg-muted rounded animate-pulse" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
                            </div>
                            <div className="h-10 w-full bg-muted rounded animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
