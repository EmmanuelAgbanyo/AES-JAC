
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch'; // Requires node-fetch or native fetch in Node 18+

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const MANUS_API_BASE = "https://api.manus.im/v1";
const API_KEY = process.env.MANUS_API_KEY;

if (!API_KEY) {
    console.error("Error: MANUS_API_KEY not found in .env.local");
    process.exit(1);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const runTest = async () => {
    console.log("Running Direct Manus API Verification...");
    console.log(`API Key Length: ${API_KEY.length}`);

    const prompt = `Hello, act as a helpful assistant. Please output a JSON object with a greeting message. Example: {"message": "Hello World"}`;

    try {
        // 1. Start Task
        console.log("Starting Manus AI Task...");
        const startResponse = await fetch(`${MANUS_API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
            })
        });

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            throw new Error(`Failed to start Manus task: ${startResponse.status} ${startResponse.statusText} - ${errorText}`);
        }

        const startData: any = await startResponse.json();
        const taskId = startData.id;
        if (!taskId) throw new Error("No task ID returned from Manus API.");

        console.log(`Manus Task Started: ${taskId}. Polling for completion...`);

        // 2. Poll for Completion
        let attempts = 0;

        while (attempts < 30) {
            await sleep(2000);
            attempts++;

            const pollResponse = await fetch(`${MANUS_API_BASE}/tasks/${taskId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            });

            if (!pollResponse.ok) {
                console.warn(`Polling failed: ${pollResponse.status}`);
                continue;
            }

            const pollData: any = await pollResponse.json();
            console.log(`Polling attempt ${attempts}: Status = ${pollData.status}`);

            if (pollData.status === 'completed') {
                console.log("✅ Task Completed!");
                console.log("Output:", pollData.output || pollData.result);
                return;
            } else if (pollData.status === 'failed') {
                throw new Error(`Manus task failed: ${pollData.error || 'Unknown error'}`);
            }
        }

        console.error("❌ Task Timed Out");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
    }
};

runTest();
