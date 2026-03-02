import { Button, Section, Text } from "@react-email/components"
import * as React from "react"
import { BaseLayout } from "./base-layout"

interface CourseReminderEmailProps {
    userName: string
    courseTitle: string
    dueDate: string
    daysRemaining: number
    courseUrl: string
    progress: number
}

export default function CourseReminderEmail({
    userName,
    courseTitle,
    dueDate,
    daysRemaining,
    courseUrl,
    progress,
}: CourseReminderEmailProps) {
    return (
        <BaseLayout preview={`Promemoria: ${courseTitle} - Scadenza tra ${daysRemaining} giorni`}>
            <Section style={content}>
                <Text style={heading}>Promemoria Corso</Text>
                <Text style={paragraph}>
                    Ciao <strong>{userName}</strong>,
                </Text>
                <Text style={paragraph}>
                    Il corso <strong>{courseTitle}</strong> scade il <strong>{dueDate}</strong> (tra {daysRemaining} giorni).
                </Text>
                <Text style={paragraph}>
                    Il tuo progresso attuale è del <strong>{progress}%</strong>.
                </Text>
                <Section style={btnContainer}>
                    <Button style={button} href={courseUrl}>
                        Continua il Corso
                    </Button>
                </Section>
            </Section>
        </BaseLayout>
    )
}

const content = { padding: "24px 32px" }
const heading = { fontSize: "24px", fontWeight: "600" as const, color: "#1a1a2e", margin: "0 0 16px" }
const paragraph = { fontSize: "14px", lineHeight: "24px", color: "#525f7f" }
const btnContainer = { textAlign: "center" as const, margin: "24px 0" }
const button = {
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600" as const,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
}
