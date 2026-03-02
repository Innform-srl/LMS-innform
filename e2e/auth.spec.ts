import { test, expect } from "@playwright/test";

const BASE = "/lms";

test.describe("Authentication", () => {
    test("login page loads correctly", async ({ page }) => {
        await page.goto(`${BASE}/login`);
        await expect(page).toHaveURL(/\/lms\/login/);
        await expect(page.locator("input[name='email']")).toBeVisible();
        await expect(page.locator("input[name='password']")).toBeVisible();
    });

    test("login with invalid credentials shows error", async ({ page }) => {
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "invalid@test.com");
        await page.fill("input[name='password']", "wrongpassword");
        await page.click("button[type='submit']");

        // Should show error message
        await expect(page.getByText(/credenziali non valide|errore/i)).toBeVisible({ timeout: 10000 });
    });

    test("login with valid credentials redirects to dashboard", async ({ page }) => {
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "admin@innform.com");
        await page.fill("input[name='password']", "admin");
        await page.click("button[type='submit']");

        // Should redirect away from login
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test("protected page redirects to login when not authenticated", async ({ page }) => {
        await page.goto(`${BASE}/dashboard/resources`);
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
});
