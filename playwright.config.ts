import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    globalSetup: "./e2e/global-setup.ts",
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: "http://localhost:3002/lms",
        screenshot: "only-on-failure",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3002/lms",
        reuseExistingServer: true,
        timeout: 120000,
    },
});
