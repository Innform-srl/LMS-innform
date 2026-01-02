"use client"

import { useEffect, useState } from "react"
import { CommentForm } from "@/components/comment-form"
import { CommentsList } from "@/components/comments-list"
import { Skeleton } from "@/components/ui/skeleton"

interface CourseDiscussionProps {
    courseId: string
    moduleId?: string
}

export function CourseDiscussion({ courseId, moduleId }: CourseDiscussionProps) {
    const [comments, setComments] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const query = new URLSearchParams({ courseId })
                if (moduleId) query.set("moduleId", moduleId)

                const res = await fetch(`/api/comments?${query}`)
                if (res.ok) {
                    const data = await res.json()
                    setComments(data)
                }
            } catch (error) {
                console.error("Failed to fetch comments", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchComments()
    }, [courseId, moduleId])

    if (isLoading) {
        return <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
        </div>
    }

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full" />
                Discussione
            </h2>

            <CommentForm courseId={courseId} moduleId={moduleId} />

            <CommentsList
                comments={comments}
                courseId={courseId}
                moduleId={moduleId}
            />
        </div>
    )
}
