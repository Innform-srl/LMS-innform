const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

async function main() {
    try {
        // Read .env file manually to avoid dependency on dotenv
        const envPath = path.join(__dirname, ".env");
        const envContent = fs.readFileSync(envPath, "utf-8");
        const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);

        if (!apiKeyMatch) {
            console.error("GEMINI_API_KEY not found in .env");
            return;
        }

        const apiKey = apiKeyMatch[1].trim();
        console.log("API Key found (starts with):", apiKey.substring(0, 5) + "...");

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use the model manager to list models
        // Note: The SDK might not expose listModels directly on genAI instance in all versions,
        // but typically it's available via the API. 
        // Actually, for @google/generative-ai, we might need to use the model directly or check documentation.
        // But let's try to just get a model and run a simple prompt with a known model to see if it works.
        // Or better, let's try to use the listModels if available? 
        // The SDK documentation says: genAI.getGenerativeModel({ model: "..." })
        // There isn't a direct listModels on the client in the node SDK usually, it's often a separate API call.

        // Test gemini-pro
        console.log("Testing gemini-pro...");
        try {
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await modelPro.generateContent("Hello");
            console.log("Success with gemini-pro!");
        } catch (e) {
            console.error("Error with gemini-pro:", e.message);
        }

        // Test gemini-1.5-flash-001
        console.log("\nTesting gemini-1.5-flash-001...");
        try {
            const modelFlash001 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
            const result = await modelFlash001.generateContent("Hello");
            console.log("Success with gemini-1.5-flash-001!");
        } catch (e) {
            console.error("Error with gemini-1.5-flash-001:", e.message);
        }

        // Test gemini-1.5-flash (again)
        console.log("\nTesting gemini-1.5-flash...");
        try {
            const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await modelFlash.generateContent("Hello");
            console.log("Success with gemini-1.5-flash!");
        } catch (e) {
            console.error("Error with gemini-1.5-flash:", e.message);
        }

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

main();
