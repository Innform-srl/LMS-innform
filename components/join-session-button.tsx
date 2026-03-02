"use client"

import { Button } from "@/components/ui/button"
import { Video } from "lucide-react"
import { registerForLiveSession } from "@/app/actions/live-session-registration"

interface JoinSessionButtonProps {
    meetingUrl: string
    liveSessionId?: string
    moduleId?: string
    userId?: string
}

export function JoinSessionButton({
    meetingUrl,
    liveSessionId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    moduleId,
    userId
}: JoinSessionButtonProps) {
    const handleJoin = async () => {
        if (userId && liveSessionId) {
            // Register/track attendance in background
            registerForLiveSession(liveSessionId, userId).catch(console.error)
        }
        window.open(meetingUrl, '_blank', 'noopener,noreferrer')
    }

    return (
        <Button
            onClick={handleJoin}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1 h-auto whitespace-nowrap"
        >
            <Video className="w-3.5 h-3.5 mr-1.5" />
            Accedi alla Sessione
        </Button>
    )
}
