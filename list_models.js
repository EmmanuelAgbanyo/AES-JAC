import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

// simple .env parser
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/VITE_GEMINI_API_KEY=(.*)/)?.[1] || env.match(/API_KEY=(.*)/)?.[1];

if (!key) {
    console.error("No key found in .env.local");
    process.exit(1);
}

const cleanKey = key.trim();
console.log(`Using key: ${cleanKey.substring(0, 5)}...`);

const ai = new GoogleGenAI({ apiKey: cleanKey });

(async () => {
    try {
        console.log("Listing models...");
        const response = await ai.models.list();

        console.log("\n--- AVAILABLE GEMINI MODELS ---");
        if (response && response.models) {
            response.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`Model: ${m.name}`);
                    if (m.supportedGenerationMethods) {
                        console.log(`Methods: ${m.supportedGenerationMethods.join(', ')}`);
                    }
                    console.log('---');
                }
            });
        } else {
            console.log("Unexpected response format:", JSON.stringify(response, null, 2));
        }

    } catch (e) {
        console.error("FAILED TO LIST MODELS.");
        console.error("Error message:", e.message);
    }
})();
