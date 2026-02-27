
const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = process.env.MANUS_API_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('MANUS_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
    }
}

if (!apiKey) {
    console.error("Error: MANUS_API_KEY not found in .env.local or process.env");
    process.exit(1);
}

const MANUS_API_MAX_ATTEMPTS = 30;

function request(method, pathStr, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.manus.im',
            port: 443,
            path: '/v1' + pathStr,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
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
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log("Running Pure Node.js Manus Verification...");
    console.log(`API Key Length: ${apiKey.length}`);

    try {
        // 1. Start Task
        console.log("Starting Manus AI Task...");
        const startData = await request('POST', '/tasks', {
            prompt: 'Return a simple JSON object: {"status": "success", "message": "Verification Complete"}'
        });

        console.log("Start Data:", JSON.stringify(startData, null, 2));
        const taskId = startData.id;
        if (!taskId) throw new Error("No task ID returned");

        console.log(`Manus Task Started: ${taskId}. Polling...`);

        // 2. Poll
        let attempts = 0;
        while (attempts < MANUS_API_MAX_ATTEMPTS) {
            await sleep(2000);
            attempts++;

            try {
                const pollData = await request('GET', `/tasks/${taskId}`);
                console.log(`Polling attempt ${attempts}: ${pollData.status}`);

                if (pollData.status === 'completed') {
                    console.log("✅ Task Completed!");
                    // Check if output is string or object
                    let output = pollData.output || pollData.result;
                    console.log("Output:", output);
                    return;
                } else if (pollData.status === 'failed') {
                    throw new Error(`Task Failed: ${JSON.stringify(pollData)}`);
                }
            } catch (e) {
                console.warn("Polling error:", e.message);
            }
        }
        console.error("Timeout waiting for task completion");

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
}

runTest();
