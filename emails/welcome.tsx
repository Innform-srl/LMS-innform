import { Button, Section, Text } from "@react-email/components"
import * as React from "react"
import { BaseLayout } from "./base-layout"

interface WelcomeEmailProps {
    userName: string
    loginUrl: string
}

export default function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
    return (
        <BaseLayout preview={`Benvenuto su INNFORM, ${userName}!`}>
            <Section style={content}>
                <Text style={heading}>Benvenuto su INNFORM!</Text>
                <Text style={paragraph}>
                    Ciao <strong>{userName}</strong>,
                </Text>
                <Text style={paragraph}>
                    Il tuo account è stato creato con successo. Puoi accedere alla piattaforma per iniziare i tuoi corsi di formazione.
                </Text>
                <Section style={btnContainer}>
                    <Button style={button} href={loginUrl}>
                        Accedi alla Piattaforma
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
