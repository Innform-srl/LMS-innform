import QRCode from "qrcode";

/**
 * Generate a unique certificate number
 * Format without edition: CERT-YYYY-NNNNNN (e.g. CERT-2024-123456)
 * Format with edition:    CERT-YYYY-EDCODE-NNNNNN (e.g. CERT-2026-FD1ED12-000001)
 */
export function generateCertificateNumber(editionCode?: string | null): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
    if (editionCode) {
        // Sanitize edition code: uppercase, remove spaces and special chars
        const sanitized = editionCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        return `CERT-${year}-${sanitized}-${random}`;
    }
    return `CERT-${year}-${random}`;
}

/**
 * Format date for Italian locale
 */
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
    try {
        return await QRCode.toDataURL(text, {
            width: 200,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
        });
    } catch (error) {
        console.error("Error generating QR code:", error);
        throw new Error("Failed to generate QR code");
    }
}

/**
 * Calculate total hours from minutes
 */
export function minutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins} minuti`;
    if (mins === 0) return `${hours} ${hours === 1 ? "ora" : "ore"}`;
    return `${hours}${hours === 1 ? "ora" : "ore"} e ${mins} minuti`;
}

/**
 * Load font buffer from CDN
 */
export async function loadFont(type: "regular" | "bold" = "regular"): Promise<ArrayBuffer> {
    const url =
        type === "bold"
            ? "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf"
            : "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font: ${response.statusText}`);
    return await response.arrayBuffer();
}
