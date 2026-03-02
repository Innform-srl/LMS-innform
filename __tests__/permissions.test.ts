import { describe, it, expect, vi } from "vitest"

// Mock auth before importing permissions
vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}))

import { canPerform } from "@/lib/permissions"

describe("canPerform", () => {
    // ADMIN should have all permissions
    it("ADMIN can create courses", () => {
        expect(canPerform("ADMIN", "course:create")).toBe(true)
    })

    it("ADMIN can delete courses", () => {
        expect(canPerform("ADMIN", "course:delete")).toBe(true)
    })

    it("ADMIN can manage users", () => {
        expect(canPerform("ADMIN", "user:manage")).toBe(true)
    })

    it("ADMIN can view analytics", () => {
        expect(canPerform("ADMIN", "analytics:view")).toBe(true)
    })

    // TEACHER should have limited permissions
    it("TEACHER can create modules", () => {
        expect(canPerform("TEACHER", "module:create")).toBe(true)
    })

    it("TEACHER can create quizzes", () => {
        expect(canPerform("TEACHER", "quiz:create")).toBe(true)
    })

    it("TEACHER can manage live sessions", () => {
        expect(canPerform("TEACHER", "live-session:manage")).toBe(true)
    })

    it("TEACHER cannot create courses", () => {
        expect(canPerform("TEACHER", "course:create")).toBe(false)
    })

    it("TEACHER cannot delete courses", () => {
        expect(canPerform("TEACHER", "course:delete")).toBe(false)
    })

    it("TEACHER cannot manage users", () => {
        expect(canPerform("TEACHER", "user:manage")).toBe(false)
    })

    it("TEACHER cannot view analytics", () => {
        expect(canPerform("TEACHER", "analytics:view")).toBe(false)
    })

    // EMPLOYEE should have no management permissions
    it("EMPLOYEE cannot create courses", () => {
        expect(canPerform("EMPLOYEE", "course:create")).toBe(false)
    })

    it("EMPLOYEE cannot create modules", () => {
        expect(canPerform("EMPLOYEE", "module:create")).toBe(false)
    })

    it("EMPLOYEE cannot manage users", () => {
        expect(canPerform("EMPLOYEE", "user:manage")).toBe(false)
    })

    it("EMPLOYEE cannot manage enrollments", () => {
        expect(canPerform("EMPLOYEE", "enrollment:manage")).toBe(false)
    })
})
