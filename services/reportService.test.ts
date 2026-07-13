import { describe, it, expect } from 'vitest';
import { generateDynamicSummary } from './reportService';
import type { ReportData } from '../types';

describe('generateDynamicSummary', () => {
  const mockEntrepreneurName = 'Acme Corp';
  const mockPeriod = 'Q1 2024';

  const baseReportData: ReportData = {
    totalIncome: 10000,
    totalExpenses: 5000,
    netIncome: 5000,
    receivablesSummary: { total: 0, count: 0 },
    transactionCount: { income: 10, expense: 5 },
    incomeByCategory: [{ category: 'Software Sales', amount: 10000, percentage: 100 }],
    expenseByCategory: [{ category: 'Server Costs', amount: 5000, percentage: 100 }],
    fullPaymentRate: 100,
    collectionRate: 100,
    totalBilled: 10000,
    topSellingItems: [],
    monthlyTrends: [{ month: 'Jan', income: 10000, expenses: 5000 }],
    topCustomers: [],
    averageTransactionValue: 1000,
    dayOfWeekAnalysis: [],
    customerConcentration: { top3Percentage: 45.5, riskLevel: 'Low' },
    liquidity: { currentRatio: 2.5, quickRatio: 2.5, cashRatio: 2.5, workingCapital: 5000 },
    cfoMetrics: {
      dupont: { roe: 10, netProfitMargin: 50, assetTurnover: 0.2, equityMultiplier: 1 },
      breakEven: { breakEvenRevenue: 2000, marginOfSafety: 80 },
      workingCapitalCycle: { daysSalesOutstanding: 0, daysPayableOutstanding: 0, cashConversionCycle: 0 },
      creditReadiness: { dscr: 2, quickRatio: 2.5, impliedValuation: 50000 }
    }
  };

  it('handles profitable business with strong liquidity', () => {
    const summary = generateDynamicSummary(baseReportData, mockEntrepreneurName, mockPeriod);

    // Check key phrases and values
    expect(summary).toContain('total revenues of GHS 10,000.00');
    expect(summary).toContain('total operating expenses of GHS 5,000.00');
    expect(summary).toContain('net income of GHS 5,000.00');
    expect(summary).toContain('net margin of 50.0%');
    expect(summary).toContain('primary contributor to revenue was Software Sales, accounting for 100.0%');
    expect(summary).toContain('largest expense category was Server Costs, representing 100.0%');
    expect(summary).toContain('business maintains a strong liquidity position');
    expect(summary).toContain('top 3 customers represent 45.5%');
  });

  it('handles business operating at a loss with adequate liquidity', () => {
    const lossData: ReportData = {
      ...baseReportData,
      totalIncome: 4000,
      totalExpenses: 6000,
      netIncome: -2000,
      incomeByCategory: [{ category: 'Consulting', amount: 4000, percentage: 100 }],
      expenseByCategory: [{ category: 'Marketing', amount: 6000, percentage: 100 }],
      liquidity: { ...baseReportData.liquidity, currentRatio: 1.5 }
    };
    const summary = generateDynamicSummary(lossData, mockEntrepreneurName, mockPeriod);

    expect(summary).toContain('total revenues of GHS 4,000.00');
    expect(summary).toContain('total operating expenses of GHS 6,000.00');
    expect(summary).toContain('net loss of GHS 2,000.00');
    // Margin is (netIncome / totalIncome) * 100 -> (-2000 / 4000) * 100 = -50.0%
    expect(summary).toContain('net margin of -50.0%');
    expect(summary).toContain('Consulting');
    expect(summary).toContain('Marketing');
    expect(summary).toContain('Working capital is adequate');
  });

  it('handles zero total income and weak liquidity gracefully', () => {
    const zeroIncomeData: ReportData = {
      ...baseReportData,
      totalIncome: 0,
      totalExpenses: 1000,
      netIncome: -1000,
      incomeByCategory: [],
      expenseByCategory: [{ category: 'Rent', amount: 1000, percentage: 100 }],
      liquidity: { ...baseReportData.liquidity, currentRatio: 0.8 }
    };
    const summary = generateDynamicSummary(zeroIncomeData, mockEntrepreneurName, mockPeriod);

    expect(summary).toContain('net loss of GHS 1,000.00');
    expect(summary).toContain('net margin of 0.0%'); // Division by zero fallback
    expect(summary).toContain('Current liquidity metrics indicate potential constraints');
  });

  it('handles missing category data by falling back to general labels', () => {
    const missingCategoryData: ReportData = {
      ...baseReportData,
      incomeByCategory: [],
      expenseByCategory: []
    };
    const summary = generateDynamicSummary(missingCategoryData, mockEntrepreneurName, mockPeriod);

    expect(summary).toContain('revenue was General Sales, accounting for 0.0%');
    expect(summary).toContain('expense category was General Expenses, representing 0.0%');
  });

  it('returns empty string if data is null or empty', () => {
    // Cast to any to bypass type check for edge case testing
    const emptySummary = generateDynamicSummary(null as any, mockEntrepreneurName, mockPeriod);
    expect(emptySummary).toBe('');

    const noMonthlyTrendsSummary = generateDynamicSummary({ ...baseReportData, monthlyTrends: [] } as any, mockEntrepreneurName, mockPeriod);
    expect(noMonthlyTrendsSummary).toBe('');
  });
});
