/**
 * Global setup for E2E tests.
 * Ensures test admin user has known credentials.
 * Only works in development mode (the endpoint is blocked in production).
 */
async function globalSetup() {
    const baseURL = "http://localhost:3002/lms";

    try {
        // Reset admin password to "admin" for testing
        const response = await fetch(`${baseURL}/api/admin/reset-password`);
        if (response.ok) {
            console.log("[E2E Setup] Admin password reset for testing");
        } else {
            console.warn("[E2E Setup] Could not reset admin password:", response.status);
        }
    } catch (error) {
        console.warn("[E2E Setup] Server not reachable for password reset:", error);
    }
}

export default globalSetup;
