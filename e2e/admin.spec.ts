import { test, expect } from "@playwright/test";

const BASE = "/lms";

test.describe("Admin access control", () => {
    test("admin can access admin dashboard", async ({ page }) => {
        // Login as admin
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "admin@innform.com");
        await page.fill("input[name='password']", "admin");
        await page.click("button[type='submit']");
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

        // Access admin dashboard
        await page.goto(`${BASE}/admin`);
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });

    test("unauthenticated user cannot access admin pages", async ({ page }) => {
        await page.goto(`${BASE}/admin`);
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test("admin courses page loads", async ({ page }) => {
        // Login as admin
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "admin@innform.com");
        await page.fill("input[name='password']", "admin");
        await page.click("button[type='submit']");
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

        await page.goto(`${BASE}/admin/courses`);
        await expect(page).toHaveURL(/\/admin\/courses/);
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });

    test("admin users page loads", async ({ page }) => {
        // Login as admin
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "admin@innform.com");
        await page.fill("input[name='password']", "admin");
        await page.click("button[type='submit']");
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

        await page.goto(`${BASE}/admin/users`);
        await expect(page).toHaveURL(/\/admin\/users/);
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });
});
