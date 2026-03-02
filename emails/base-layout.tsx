import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Hr,
} from "@react-email/components"
import * as React from "react"

interface BaseLayoutProps {
    preview: string
    children: React.ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Text style={logo}>INNFORM</Text>
                    </Section>
                    {children}
                    <Hr style={hr} />
                    <Text style={footer}>
                        INNFORM - Piattaforma di Formazione Professionale
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    maxWidth: "580px",
    borderRadius: "8px",
}

const header = {
    padding: "24px 32px",
    borderBottom: "1px solid #e6ebf1",
}

const logo = {
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#1a1a2e",
    margin: "0",
}

const hr = {
    borderColor: "#e6ebf1",
    margin: "20px 32px",
}

const footer = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    padding: "0 32px",
}
