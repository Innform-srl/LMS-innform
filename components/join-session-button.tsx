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
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
        >
            <Video className="w-5 h-5 mr-2" />
            Accedi alla Sessione
        </Button>
    )
}
