import { Button, Section, Text } from "@react-email/components"
import * as React from "react"
import { BaseLayout } from "./base-layout"

interface CertificateEmailProps {
    userName: string
    courseTitle: string
    certificateNumber: string
    certificateUrl: string
    verifyUrl: string
}

export default function CertificateEmail({
    userName,
    courseTitle,
    certificateNumber,
    certificateUrl,
    verifyUrl,
}: CertificateEmailProps) {
    return (
        <BaseLayout preview={`Certificato ottenuto: ${courseTitle}`}>
            <Section style={content}>
                <Text style={heading}>Certificato Ottenuto!</Text>
                <Text style={paragraph}>
                    Congratulazioni <strong>{userName}</strong>,
                </Text>
                <Text style={paragraph}>
                    Hai completato con successo il corso <strong>{courseTitle}</strong> e hai ottenuto il certificato n. <strong>{certificateNumber}</strong>.
                </Text>
                <Section style={btnContainer}>
                    <Button style={button} href={certificateUrl}>
                        Scarica Certificato
                    </Button>
                </Section>
                <Text style={small}>
                    Puoi verificare l&apos;autenticità del certificato su: {verifyUrl}
                </Text>
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
const small = { fontSize: "12px", color: "#8898aa", lineHeight: "18px" }
