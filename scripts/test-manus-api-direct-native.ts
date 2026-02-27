
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env.local manually if dotenv fails (backup)
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const MANUS_API_BASE = "api.manus.im";
const API_KEY = process.env.MANUS_API_KEY;

if (!API_KEY) {
    console.error("Error: MANUS_API_KEY not found in .env.local");
    process.exit(1);
}

const request = (method: string, path: string, body?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: MANUS_API_BASE,
            port: 443,
            path: '/v1' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data); // Return text if not JSON
                    }
                } else {
                    reject(new Error(`Request failed Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const runTest = async () => {
    console.log("Running Native HTTPS Verification...");
    console.log(`API Key Length: ${API_KEY.length}`);

    try {
        // 1. Start Task
        console.log("Starting Manus AI Task...");
        const startData = await request('POST', '/tasks', {
            prompt: 'Hello, verify connection. Return JSON: {"status": "connected"}'
        });

        console.log("Start Data:", startData);
        const taskId = startData.id;
        if (!taskId) throw new Error("No task ID returned");

        console.log(`Manus Task Started: ${taskId}. Polling...`);

        // 2. Poll
        let attempts = 0;
        while (attempts < 30) {
            await sleep(2000);
            attempts++;

            try {
                const pollData = await request('GET', `/tasks/${taskId}`);
                console.log(`Polling attempt ${attempts}: ${pollData.status}`);

                if (pollData.status === 'completed') {
                    console.log("✅ Task Completed!");
                    console.log("Output:", pollData.output || pollData.result);
                    return;
                } else if (pollData.status === 'failed') {
                    throw new Error(`Task Failed: ${pollData.error}`);
                }
            } catch (e) {
                console.warn("Polling error:", e);
            }
        }
        console.error("Timeout");

    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
};

runTest();
