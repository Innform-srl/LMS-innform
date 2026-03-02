import { describe, it, expect } from "vitest"
import {
    sanitizeHtml,
    isValidEmail,
    isValidUrl,
    sanitizeFilename,
    hasXss,
    sanitizeTextInput,
    timingSafeEqual,
} from "@/lib/security"

describe("sanitizeHtml", () => {
    it("encodes HTML entities", () => {
        expect(sanitizeHtml("<script>alert('xss')</script>")).not.toContain("<script>")
    })

    it("encodes quotes", () => {
        expect(sanitizeHtml('" onmouseover="alert(1)"')).not.toContain('"')
    })

    it("returns empty string for empty input", () => {
        expect(sanitizeHtml("")).toBe("")
    })

    it("preserves plain text", () => {
        const result = sanitizeHtml("Hello World 123")
        expect(result).toContain("Hello World 123")
    })
})

describe("isValidEmail", () => {
    it("accepts valid emails", () => {
        expect(isValidEmail("user@example.com")).toBe(true)
        expect(isValidEmail("name.surname@domain.co.it")).toBe(true)
    })

    it("rejects invalid emails", () => {
        expect(isValidEmail("not-an-email")).toBe(false)
        expect(isValidEmail("@domain.com")).toBe(false)
        expect(isValidEmail("user@")).toBe(false)
        expect(isValidEmail("")).toBe(false)
    })
})

describe("isValidUrl", () => {
    it("accepts valid URLs", () => {
        expect(isValidUrl("https://example.com")).toBe(true)
        expect(isValidUrl("http://localhost:3000")).toBe(true)
    })

    it("rejects invalid URLs", () => {
        expect(isValidUrl("not-a-url")).toBe(false)
        expect(isValidUrl("")).toBe(false)
    })
})

describe("sanitizeFilename", () => {
    it("removes directory traversal", () => {
        expect(sanitizeFilename("../../etc/passwd")).not.toContain("..")
        expect(sanitizeFilename("../../etc/passwd")).not.toContain("/")
    })

    it("replaces special characters", () => {
        expect(sanitizeFilename("file name (1).pdf")).toBe("file_name__1_.pdf")
    })

    it("preserves safe characters", () => {
        expect(sanitizeFilename("document-v2.pdf")).toBe("document-v2.pdf")
    })
})

describe("hasXss", () => {
    it("detects script tags", () => {
        expect(hasXss("<script>alert('xss')</script>")).toBe(true)
    })

    it("detects javascript: protocol", () => {
        expect(hasXss("javascript:alert(1)")).toBe(true)
    })

    it("detects event handlers", () => {
        expect(hasXss('<img onerror="alert(1)">')).toBe(true)
    })

    it("detects iframe tags", () => {
        expect(hasXss("<iframe src='evil.com'></iframe>")).toBe(true)
    })

    it("returns false for safe input", () => {
        expect(hasXss("Hello World")).toBe(false)
        expect(hasXss("Normal text with <b>bold</b>")).toBe(false)
    })
})

describe("sanitizeTextInput", () => {
    it("returns valid for normal text", () => {
        const result = sanitizeTextInput("Hello World")
        expect(result.valid).toBe(true)
    })

    it("rejects text exceeding maxLength", () => {
        const result = sanitizeTextInput("Hello", { maxLength: 3 })
        expect(result.valid).toBe(false)
        expect(result.sanitized).toBe("Hel")
    })

    it("rejects XSS content", () => {
        const result = sanitizeTextInput("<script>alert(1)</script>")
        expect(result.valid).toBe(false)
    })

    it("handles empty input", () => {
        const result = sanitizeTextInput("")
        expect(result.valid).toBe(true)
        expect(result.sanitized).toBe("")
    })
})

describe("timingSafeEqual", () => {
    it("returns true for equal strings", () => {
        expect(timingSafeEqual("abc", "abc")).toBe(true)
    })

    it("returns false for different strings", () => {
        expect(timingSafeEqual("abc", "def")).toBe(false)
    })

    it("returns false for different lengths", () => {
        expect(timingSafeEqual("abc", "abcd")).toBe(false)
    })
})
