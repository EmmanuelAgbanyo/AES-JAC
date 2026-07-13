/// <reference types="vite/client" />

import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration, Tool } from "@google/genai";
import type { Transaction, AiReport, Entrepreneur, GrowthPlan, ContractData, DashboardInsight, ChatMessage, Resource, SuggestedResource, Goal, PartialTransaction } from '../types';
import { GENAI_MODEL_NAME, TransactionType, PaymentMethod } from '../constants';

const getApiKey = (): string | undefined => {
  try {
    return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' && process.env.API_KEY);
  } catch (e) {
    return undefined;
  }
};

export const parseExpenseFromReceipt = async (imageBase64Data: string): Promise<PartialTransaction> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });

  const expenseSchema = {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING },
      date: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      productServiceCategory: { type: Type.STRING },
    },
    required: ['date', 'description', 'amount']
  };

  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64Data } }, { text: "Parse this receipt into JSON." }] },
    config: { responseMimeType: "application/json", responseSchema: expenseSchema }
  });
  const text = response.text || "{}";
  const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanText);
};

export const generateAiPoweredReport = async (
  transactions: Transaction[],
  entrepreneur: Entrepreneur,
  period: string,
  goals?: Goal[]
): Promise<AiReport> => {
  // 1. Generate Deterministic Financials
  const { generateFinancialStatements, generateReportData } = await import('./reportService');
  const financialData = generateFinancialStatements(transactions, period);
  const reportData = generateReportData(entrepreneur.id, period, transactions);

  const reportSchema = {
    // ... existing schema ...
    type: Type.OBJECT,
    properties: {
      reportTitle: { type: Type.STRING },
      executiveSummary: { type: Type.STRING },
      period: { type: Type.STRING },
      // KPIs are now deterministically calculated and no longer required from the AI
      // Removed financial statement schemas as we will inject them directly
      cashFlowStatement: {
        type: Type.OBJECT,
        properties: {
          operating: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, amount: { type: Type.STRING }, isTotal: { type: Type.BOOLEAN }, isNegative: { type: Type.BOOLEAN } } } },
          investing: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, amount: { type: Type.STRING }, isTotal: { type: Type.BOOLEAN }, isNegative: { type: Type.BOOLEAN } } } },
          financing: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, amount: { type: Type.STRING }, isTotal: { type: Type.BOOLEAN }, isNegative: { type: Type.BOOLEAN } } } },
          netCashChange: { type: Type.STRING },
          closingCash: { type: Type.STRING }
        }
      },
      forecast: {
        type: Type.OBJECT,
        properties: {
          projectedRevenue: { type: Type.STRING },
          projectedOpEx: { type: Type.STRING },
          assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      },
      strategicRecommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, priority: { type: Type.STRING } } } },
      advancedCfoCommentary: {
        type: Type.OBJECT,
        properties: {
          dupontAnalysis: { type: Type.STRING },
          breakEvenAnalysis: { type: Type.STRING },
          efficiencyMetrics: { type: Type.STRING }
        }
      },
      venturePitch: {
        type: Type.OBJECT,
        properties: {
          investmentThesis: { type: Type.STRING },
          theAskAndUseOfFunds: { type: Type.STRING },
          riskMitigation: { type: Type.STRING }
        }
      }
    },
    required: ['reportTitle', 'executiveSummary', 'cashFlowStatement', 'advancedCfoCommentary', 'venturePitch']
  };

  const prompt = `Act as a Forensic CFO and Board-Level Auditor for Africa Entrepreneurship School (AES). 
  Generate an "Integrated Annual Report" for ${entrepreneur.businessName} for the period ${period}.
  
  Input Data: ${JSON.stringify(transactions)}.
  Entity Profile: ${entrepreneur.bio}.
  
  **Financial Statements and KPIs have already been calculated.**
  Your job is to provide the **Executive Summary, Cash Flow Analysis, Strategic Recommendations, and Forecasts** based exactly on these numbers:
  - Net Income: ${financialData.incomeStatement.netIncome}
  - Total Assets: ${financialData.balanceSheet.totalAssets}
  - Gross Margin: ${financialData.kpis.grossMargin}
  - EBITDA Margin: ${financialData.kpis.ebitdaMargin}
  - Net Margin: ${financialData.kpis.netMargin}
  - Burn Rate: ${financialData.kpis.burnRate}
  - Runway: ${financialData.kpis.runwayMonths}
  - ROE (Dupont): ${reportData.cfoMetrics.dupont.roe.toFixed(2)}%
  - Asset Turnover: ${reportData.cfoMetrics.dupont.assetTurnover.toFixed(2)}x
  - Equity Multiplier: ${reportData.cfoMetrics.dupont.equityMultiplier.toFixed(2)}x
  - Break-Even Revenue: ${reportData.cfoMetrics.breakEven.breakEvenRevenue.toFixed(2)}
  - Margin of Safety: ${reportData.cfoMetrics.breakEven.marginOfSafety.toFixed(2)}%
  - Cash Conversion Cycle: ${reportData.cfoMetrics.workingCapitalCycle.cashConversionCycle.toFixed(1)} days
  - DSCR (Debt Service): ${reportData.cfoMetrics.creditReadiness.dscr.toFixed(2)}x
  - Implied Valuation: ${reportData.cfoMetrics.creditReadiness.impliedValuation.toLocaleString()}
  
  Mandatory Reporting Logic:
  1. Cash Flow: Use the Indirect Method. Reconcile Net Income back to Cash.
  2. Forecast: Provide highly professional, data-driven estimates and assumptions.
  3. Advanced CFO Commentary: Provide board-level synthesis on the DuPont breakdown (why is ROE what it is based on the turnover and multiplier), the Break-Even efficiency, and the working capital cycle.
  4. Venture & Credit Pitch: Act as an Investment Banker preparing a pitch deck. Provide an "investmentThesis" based on traction, define "theAskAndUseOfFunds" based on the projected shortfall or growth capital needed, and outline "riskMitigation" for credit officers.
  5. Tone: Ruthlessly objective, analytical, action-oriented corporate auditor and elite VC advisor style.
  
  Return a structured JSON following the schema. Do not include markdown formatting like \`\`\`json. Return strictly the raw JSON.`;

  let aiData: Partial<AiReport> = {};
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: reportSchema,
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      });
      const text = response.text || "{}";
      const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
      aiData = JSON.parse(cleanText);
    } catch (err) {
      console.warn("Gemini AI failed, preparing to fall back to puter.js", err);
    }
  }

  if (!aiData || Object.keys(aiData).length === 0) {
    try {
        const { puter } = await import('@heyputer/puter.js');
        const puterResponse = await puter.ai.chat(prompt + "\n\nRETURN ONLY RAW, VALID JSON matching the required schema. NO TEXT OR MARKDOWN OUTSIDE THE JSON.");
        const text = typeof puterResponse === 'string' ? puterResponse : puterResponse?.message?.content || (puterResponse as any)?.text || puterResponse?.toString() || "{}";
        const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
        try {
            aiData = JSON.parse(cleanText);
        } catch (e) {
            throw new Error(`Parse failed. text: ${text.substring(0, 50)}... type: ${typeof puterResponse}, keys: ${typeof puterResponse === 'object' ? Object.keys(puterResponse).join(',') : ''}`);
        }
    } catch (err) {
        console.error("Puter AI fallback failed:", err);
        // Return a mock AI object so the UI displays the error instead of falling back to the standard report immediately
        aiData = {
          reportTitle: "Puter AI Fallback Error",
          executiveSummary: "Error from Puter.js: " + (err instanceof Error ? err.message : JSON.stringify(err)),
          period: period,
          cashFlowStatement: { operating: [], investing: [], financing: [], netCashChange: "0", closingCash: "0" },
          forecast: { projectedRevenue: "0", projectedOpEx: "0", assumptions: [] },
          strategicRecommendations: [{ recommendation: "Debug Puter JS", priority: "high" }],
          advancedCfoCommentary: { dupontAnalysis: "", breakEvenAnalysis: "", efficiencyMetrics: "" },
          venturePitch: { investmentThesis: "", theAskAndUseOfFunds: "", riskMitigation: "" }
        };
    }
  }

  try {
    // Merge deterministic financials and KPIs with AI insights
    const completeReport: AiReport = {
      reportTitle: aiData.reportTitle || "Generated Report",
      executiveSummary: aiData.executiveSummary || "",
      period: aiData.period || period,
      cashFlowStatement: aiData.cashFlowStatement || { operating: [], investing: [], financing: [], netCashChange: "0", closingCash: "0" },
      forecast: aiData.forecast || { projectedRevenue: "0", projectedOpEx: "0", assumptions: [] },
      strategicRecommendations: aiData.strategicRecommendations || [],
      advancedCfoCommentary: aiData.advancedCfoCommentary,
      venturePitch: aiData.venturePitch,
      kpis: financialData.kpis,
      incomeStatement: financialData.incomeStatement,
      balanceSheet: financialData.balanceSheet,
      cfoMetrics: reportData.cfoMetrics
    };
    return completeReport;

  } catch (error) {
    console.error("Failed to parse AI report JSON:", error);
    throw new Error("Failed to generate complete report. The AI response was truncated or malformed.");
  }
};

export const parseTransactionsFromPdf = async (pdfBase64Data: string): Promise<{ transactions: any[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: { parts: [{ inlineData: { mimeType: 'application/pdf', data: pdfBase64Data } }, { text: "Extract transactions to JSON." }] },
    config: { responseMimeType: "application/json" }
  });
  const text = response.text || "{}";
  const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanText);
};

export const generateGrowthPlan = async (bp: string, na: string, en: string, res: Resource[]): Promise<GrowthPlan> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: `Plan for ${en}. Profile: ${bp}. Needs: ${na}.`,
    config: { responseMimeType: "application/json" }
  });
  const text = response.text || "{}";
  const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanText);
};

export const generateContract = async (ct: string, bp: string): Promise<ContractData> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: `Draft ${ct}. Profile: ${bp}.`,
    config: { responseMimeType: "application/json" }
  });
  const text = response.text || "{}";
  const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanText);
};

export const generateDashboardInsights = async (e: Entrepreneur[], t: Transaction[]): Promise<DashboardInsight[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: `Dashboard insights for ${e.length} businesses. Data: ${JSON.stringify(t.slice(0, 50))}`,
    config: { responseMimeType: "application/json" }
  });
  const text = response.text || "{}";
  const cleanText = text.replace(/```json\s*|\s*```/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanText).insights || [];
};

export const queryDataWithAi = async (q: string, e: Entrepreneur[], t: Transaction[], h: ChatMessage[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: q,
    config: { systemInstruction: "Answer based on AES JAC data." }
  });
  return response.text;
};

export const processChatWithTools = async (i: string, h: ChatMessage[], e: Entrepreneur[]): Promise<{ text: string, toolCall?: { name: string, args: any } }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENAI_MODEL_NAME,
    contents: i,
    config: { systemInstruction: "Record AES transactions." }
  });
  return { text: response.text };
};
