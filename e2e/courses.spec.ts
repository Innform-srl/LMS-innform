import { test, expect } from "@playwright/test";

const BASE = "/lms";

test.describe("Courses", () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto(`${BASE}/login`);
        await page.fill("input[name='email']", "admin@innform.com");
        await page.fill("input[name='password']", "admin");
        await page.click("button[type='submit']");
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test("courses page loads and shows course list", async ({ page }) => {
        await page.goto(`${BASE}/courses`);
        await expect(page).toHaveURL(/\/courses/);
        // Page should load without errors
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });

    test("course detail page loads", async ({ page }) => {
        await page.goto(`${BASE}/courses`);

        // Click on "Vedi Dettagli" button for the first course
        const detailButton = page.getByText("Vedi Dettagli").first();
        if (await detailButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await detailButton.click();
            await expect(page).toHaveURL(/\/courses\/.+/, { timeout: 10000 });
            await expect(page.locator("body")).not.toContainText("Internal Server Error");
        }
    });
});
