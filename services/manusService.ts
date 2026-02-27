
import type { Transaction, AiReport, Entrepreneur, Goal } from '../types';
import { generateFinancialStatements, generateReportData } from './reportService';

const MANUS_API_BASE = "/api/manus/v1";

const getApiKey = (): string | undefined => {
    try {
        return process.env.MANUS_API_KEY;
    } catch (e) {
        return undefined;
    }
};

interface ManusTaskResponse {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    result?: any; // The structure might vary, we'll check for 'output' or 'result'
    error?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAiPoweredReport = async (
    transactions: Transaction[],
    entrepreneur: Entrepreneur,
    period: string,
    goals?: Goal[]
): Promise<AiReport> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Manus API key not found. Please check your .env.local file.");

    // 1. Generate Rich Financial Data (to feed into AI)
    const reportData = generateReportData(entrepreneur.id, period, transactions);
    // Also keep the statement logic if needed for strict accounting structure, or rely on reportData
    const financialStatements = generateFinancialStatements(transactions, period);

    // 2. Construct Prompt
    const prompt = `Act as a Forensic CFO and Board-Level Auditor for Africa Entrepreneurship School (AES). 
  Generate an "Integrated Annual Report" for ${entrepreneur.businessName} for the period ${period}.
  
  **Entity Profile**: ${entrepreneur.bio || "No bio provided"}.
  
  **Financial Health Dashboard (Pre-Calculated Metrics)**:
  - Net Income: ${reportData.netIncome}
  - Total Revenue: ${reportData.totalIncome}
  - Profit Margin: ${((reportData.netIncome / (reportData.totalIncome || 1)) * 100).toFixed(1)}%
  - Customer Concentration Risk: ${reportData.customerConcentration.riskLevel} (Top 3 clients = ${reportData.customerConcentration.top3Percentage.toFixed(1)}% of revenue)
  - Liquidity (Current Ratio): ${reportData.liquidity.currentRatio.toFixed(2)}
  - Day of Week Trend: Busiest day is ${reportData.dayOfWeekAnalysis.sort((a, b) => b.income - a.income)[0].day}
  
  **Raw Data Context**:
  - Top Selling Categories: ${JSON.stringify(reportData.topSellingItems.map(i => `${i.category} (${i.percentage.toFixed(0)}%)`))}
  - Validated Transactions: ${JSON.stringify(transactions.map(t => ({ date: t.date, type: t.type, amount: t.amount, category: t.productServiceCategory || 'General', desc: t.description })))}

  **Mandatory Accounting Logic**:
  1. Cash Flow: Use Indirect Method starting from Net Income (${reportData.netIncome}).
  2. Strategic Analysis: You MUST reference the "Customer Concentration" and "Liquidity" metrics in your narrative.
  
  **Your Task**:
  Return ONLY a valid JSON object with the following structure (do not include markdown formatting like \`\`\`json):
  {
    "reportTitle": "string (e.g., 'Strategic Financial Audit: [Business Name]')",
    "executiveSummary": "string (High-level CFO summary of performance, risks, and health)",
    "period": "${period}",
    "kpis": {
      "grossMargin": "string (Calculate from Revenue - COGS)",
      "ebitdaMargin": "string",
      "netMargin": "string (Use pre-calculated match: ${((reportData.netIncome / (reportData.totalIncome || 1)) * 100).toFixed(1)}%)",
      "burnRate": "string (Monthly average expense)",
      "runwayMonths": "string (Cash / Burn Rate)"
    },
    "cashFlowStatement": {
      "operating": [{ "label": "string", "amount": "string", "isTotal": boolean, "isNegative": boolean }],
      "investing": [],
      "financing": [],
      "netCashChange": "string",
      "closingCash": "string"
    },
    "forecast": {
      "projectedRevenue": "string",
      "projectedOpEx": "string",
      "assumptions": ["string (e.g., 'Based on 15% month-over-month growth')"]
    },
    "strategicRecommendations": [{ "recommendation": "string (Actionable advice based on the metrics)", "priority": "high|medium|low" }]
  }`;

    // 3. Start Task
    console.log("Starting Manus AI Task...");
    const startResponse = await fetch(`${MANUS_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'API_KEY': apiKey
        },
        body: JSON.stringify({
            prompt: prompt,
            agentProfile: "manus-1.6-max",
            taskMode: "agent",
            interactiveMode: false
        })
    });

    if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Failed to start Manus task: ${startResponse.status} ${startResponse.statusText} - ${errorText}`);
    }

    const startData = await startResponse.json();
    const taskId = startData.task_id || startData.id;
    if (!taskId) throw new Error("No task ID returned from Manus API.");

    console.log(`Manus Task Started: ${taskId}. Polling for completion...`);

    // 4. Poll for Completion
    const maxRetries = 300; // 300 * 2s = 600s (10 minutes) timeout
    let attempts = 0;
    let taskResult: ManusTaskResponse | null = null;

    while (attempts < maxRetries) {
        await sleep(2000); // Wait 2 seconds
        attempts++;

        const pollResponse = await fetch(`${MANUS_API_BASE}/tasks/${taskId}`, {
            method: 'GET',
            headers: {
                'API_KEY': apiKey
            }
        });

        if (!pollResponse.ok) {
            console.warn(`Polling failed: ${pollResponse.status}`);
            continue;
        }

        const pollData = await pollResponse.json();
        console.log(`Polling attempt ${attempts}: Status = ${pollData.status}`);

        if (pollData.status === 'completed') {
            taskResult = pollData;
            break;
        } else if (pollData.status === 'failed') {
            throw new Error(`Manus task failed: ${pollData.error || 'Unknown error'}`);
        }
    }

    if (!taskResult) {
        throw new Error("Manus task timed out.");
    }

    // 5. Parse Result
    // The result might be in `output` (string) or `result` (object/string) depending on API version
    let rawOutput = taskResult.output || taskResult.result;
    if (!rawOutput && taskResult.status === 'completed') {
        // Fallback for some tasks
        rawOutput = JSON.stringify(taskResult);
    }

    if (typeof rawOutput !== 'string') {
        rawOutput = JSON.stringify(rawOutput);
    }

    // Improved JSON Extraction
    let cleanJson = rawOutput;
    const jsonStart = cleanJson.indexOf('{');
    const jsonEnd = cleanJson.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
    } else {
        // Fallback cleanup if braces aren't found (unlikely for valid JSON)
        cleanJson = rawOutput.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
    }

    try {
        const aiData = JSON.parse(cleanJson);
        return {
            ...aiData,
            incomeStatement: financialStatements.incomeStatement,
            balanceSheet: financialStatements.balanceSheet
        };
    } catch (e) {
        console.error("Failed to parse Manus AI JSON response:", rawOutput);
        throw new Error("Failed to parse report data from Manus AI.");
    }
};
