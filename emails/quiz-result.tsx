import { Button, Section, Text } from "@react-email/components"
import * as React from "react"
import { BaseLayout } from "./base-layout"

interface QuizResultEmailProps {
    quizTitle: string
    passed: boolean
    score: number
    dashboardUrl: string
}

export default function QuizResultEmail({
    quizTitle,
    passed,
    score,
    dashboardUrl,
}: QuizResultEmailProps) {
    return (
        <BaseLayout preview={`Risultato quiz: ${quizTitle} - ${score}%`}>
            <Section style={content}>
                <Text style={heading}>Risultato Quiz: {quizTitle}</Text>
                <Text style={paragraph}>
                    Hai {passed ? "superato" : "fallito"} il quiz con un punteggio del <strong>{score}%</strong>.
                </Text>
                {passed ? (
                    <Text style={paragraph}>
                        Congratulazioni! Il tuo certificato è disponibile nella piattaforma.
                    </Text>
                ) : (
                    <Text style={paragraph}>
                        Puoi riprovare il quiz quando vuoi.
                    </Text>
                )}
                <Section style={btnContainer}>
                    <Button style={button} href={dashboardUrl}>
                        Vai alla Dashboard
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
