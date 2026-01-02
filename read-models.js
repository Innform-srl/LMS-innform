const fs = require('fs');

try {
    // Try reading as utf-16le first since that's what the error suggested
    let content = fs.readFileSync('models.json', 'utf16le');
    // If that fails or looks wrong (e.g. if curl actually wrote utf8 but powershell messed it up), we might need to adjust.
    // But usually > in powershell produces utf16le.

    // Sometimes the BOM is present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const data = JSON.parse(content);
    console.log("Available Models:");
    data.models.forEach(m => console.log(m.name));
} catch (e) {
    console.error("Error parsing JSON:", e.message);
    // Fallback try utf8
    try {
        const content = fs.readFileSync('models.json', 'utf8');
        const data = JSON.parse(content);
        console.log("Available Models (UTF8):");
        data.models.forEach(m => console.log(m.name));
    } catch (e2) {
        console.error("Error parsing JSON as UTF8:", e2.message);
    }
}
