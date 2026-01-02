"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type Comment = {
    id: string
    content: string
    createdAt: string
    user: {
        name: string | null
        email: string | null
        image?: string | null
    }
    replies?: Comment[]
}

interface CommentsListProps {
    comments: Comment[]
    courseId?: string
    moduleId?: string
    currentUser?: {
        id: string
        name?: string | null
        image?: string | null
    }
}

export function CommentsList({ comments, courseId, moduleId, currentUser }: CommentsListProps) {
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleReply = async (parentId: string) => {
        if (!replyContent.trim()) return

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: replyContent,
                    courseId,
                    moduleId,
                    parentId
                })
            })

            if (!response.ok) throw new Error("Errore durante l'invio")

            setReplyContent("")
            setReplyingTo(null)
            router.refresh()
            toast({
                title: "Risposta inviata",
                description: "La tua risposta è stata pubblicata con successo."
            })
        } catch (error) {
            toast({
                title: "Errore",
                description: "Non è stato possibile inviare la risposta.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                    <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={comment.user.image || ""} />
                        <AvatarFallback>{comment.user.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <div className="glass border-border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">{comment.user.name || "Utente"}</span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: it })}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm">{comment.content}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 px-2">
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Rispondi
                            </button>
                        </div>

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                            <div className="mt-4 flex gap-3">
                                <div className="flex-1">
                                    <Textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Scrivi una risposta..."
                                        className="bg-muted/50 border-border min-h-[80px] mb-2"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setReplyingTo(null)}
                                        >
                                            Annulla
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleReply(comment.id)}
                                            disabled={isSubmitting || !replyContent.trim()}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            Rispondi
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="pl-4 border-l-2 border-border mt-4">
                                <CommentsList
                                    comments={comment.replies}
                                    courseId={courseId}
                                    moduleId={moduleId}
                                    currentUser={currentUser}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
