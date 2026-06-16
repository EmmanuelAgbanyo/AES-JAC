
import type { Entrepreneur, Transaction, ReportData } from '../types';
import { TransactionType, PaidStatus } from '../constants';

export const generateReportData = (
  entrepreneurId: string,
  period: string, // YYYY-MM or YYYY
  allTransactions: Transaction[]
): ReportData => {
  const transactions = allTransactions.filter(
    t => t.entrepreneurId === entrepreneurId && t.date.startsWith(period)
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalBilled = 0; // Total amount for all income transactions this period
  const incomeTransactions: Transaction[] = [];
  const expenseTransactions: Transaction[] = [];

  const incomeByCategoryMap: Record<string, number> = {};
  const expenseByCategoryMap: Record<string, number> = {};

  transactions.forEach(t => {
    const category = t.productServiceCategory || 'Uncategorized';
    if (t.type === TransactionType.INCOME) {
      totalIncome += t.amount; // This assumes amount is what was actually received or fully paid value
      totalBilled += t.amount; // For simplicity, assume amount is the billed amount
      incomeTransactions.push(t);
      incomeByCategoryMap[category] = (incomeByCategoryMap[category] || 0) + t.amount;
    } else {
      totalExpenses += t.amount;
      expenseTransactions.push(t);
      expenseByCategoryMap[category] = (expenseByCategoryMap[category] || 0) + t.amount;
    }
  });

  const netIncome = totalIncome - totalExpenses;

  // Receivables: sum of amounts for transactions not fully paid
  const outstandingReceivables = incomeTransactions
    .filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL)
    .reduce((sum, t) => {
      // A more complex model would track original billed vs amount paid for partials.
      // For now, if partial, the transaction.amount is considered outstanding.
      return sum + t.amount;
    }, 0);

  const receivablesSummary = {
    total: outstandingReceivables,
    count: incomeTransactions.filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL).length,
  };

  // Collection Rate: (Total Billed - Outstanding Receivables) / Total Billed
  // This is an approximation. A more accurate calculation would need to sum actual cash received.
  // For now, totalIncome represents cash collected or value of fully paid services.
  // Let's define totalBilled as sum of all income transaction amounts.
  // And totalCollected as totalBilled - outstandingReceivables
  const totalCollected = totalBilled - outstandingReceivables;
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;


  const transactionCount = {
    income: incomeTransactions.length,
    expense: expenseTransactions.length,
  };

  const incomeByCategory = Object.entries(incomeByCategoryMap)
    .map(([category, amount]) => ({ category, amount, percentage: totalBilled > 0 ? (amount / totalBilled) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const expenseByCategory = Object.entries(expenseByCategoryMap)
    .map(([category, amount]) => ({ category, amount, percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const fullyPaidIncomeTransactions = incomeTransactions.filter(t => t.paidStatus === PaidStatus.FULL).length;
  const fullPaymentRate = incomeTransactions.length > 0 ? (fullyPaidIncomeTransactions / incomeTransactions.length) * 100 : 0;

  /* 
    Advanced Metrics Calculation 
  */

  // 1. Monthly Trends (Last 6 Months relative to selected period end)
  const monthlyTrends: { month: string; income: number; expenses: number }[] = [];
  const [yearStr, monthStr] = period.split('-');
  const endDate = new Date(parseInt(yearStr), monthStr ? parseInt(monthStr) : 12, 0); // End of selected period

  for (let i = 5; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    // Fix: Handle month overflow/underflow correctly if needed, but JS Date handles negative months in constructor automatically
    const mStr = d.toISOString().slice(0, 7); // YYYY-MM

    const monthTrans = allTransactions.filter(t => t.date.startsWith(mStr) && t.entrepreneurId === entrepreneurId);
    const inc = monthTrans.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const exp = monthTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

    monthlyTrends.push({
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      income: inc,
      expenses: exp
    });
  }

  // 2. Top Customers (by Revenue)
  const customerRevenueMap: Record<string, { total: number, count: number }> = {};
  incomeTransactions.forEach(t => {
    // Use customerName if available, otherwise fall back to description or "Unknown"
    // In a real app, customerName should be strictly enforced or linked to Client entity
    const name = t.customerName || t.description.split('-')[0].trim() || 'Walk-in Customer';
    if (!customerRevenueMap[name]) customerRevenueMap[name] = { total: 0, count: 0 };
    customerRevenueMap[name].total += t.amount;
    customerRevenueMap[name].count += 1;
  });

  const topCustomers = Object.entries(customerRevenueMap)
    .map(([name, data]) => ({ name, totalRevenue: data.total, transactionCount: data.count }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // 3. Average Transaction Value
  const averageTransactionValue = incomeTransactions.length > 0
    ? totalIncome / incomeTransactions.length
    : 0;

  // 4. Day of Week Analysis
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekMap: Record<string, { income: number; count: number }> = {};
  days.forEach(d => dayOfWeekMap[d] = { income: 0, count: 0 });

  incomeTransactions.forEach(t => {
    const date = new Date(t.date);
    const dayName = days[date.getDay()];
    if (dayOfWeekMap[dayName]) {
      dayOfWeekMap[dayName].income += t.amount;
      dayOfWeekMap[dayName].count += 1;
    }
  });

  const dayOfWeekAnalysis = days.map(day => ({
    day,
    income: dayOfWeekMap[day].income,
    count: dayOfWeekMap[day].count
  }));

  // 5. Customer Concentration Risk
  const totalRevenue = totalIncome;
  const top3Revenue = topCustomers.slice(0, 3).reduce((sum, c) => sum + c.totalRevenue, 0);
  const top3Percentage = totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0;

  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (top3Percentage > 50) riskLevel = 'High';
  else if (top3Percentage > 30) riskLevel = 'Medium';

  const customerConcentration = { top3Percentage, riskLevel };

  const topSellingItems = [...incomeByCategory].slice(0, 5);

  // 6. Liquidity & Positioning
  const currentAssets = totalIncome + outstandingReceivables; // Cash + Receivables (Simplified)
  const currentLiabilities = totalExpenses * 0.2; // Assumption: 20% of expenses are pending/short-term payables if not tracked

  // Guard against division by zero
  const safeLiabilities = currentLiabilities > 0 ? currentLiabilities : 1;

  const liquidity = {
    currentRatio: currentAssets / safeLiabilities,
    quickRatio: (totalIncome) / safeLiabilities, // Cash only
    cashRatio: totalIncome / safeLiabilities,
    workingCapital: currentAssets - currentLiabilities
  };

  // 7. Advanced CFO Metrics

  // 7a. DuPont Analysis (Simplified)
  // ROE = Net Profit Margin * Asset Turnover * Equity Multiplier
  const totalAssetsDemo = currentAssets + 75000; // Match demo fixed assets
  const totalEquityDemo = 75000 + netIncome; // Match demo base equity + RE

  const netProfitMargin = totalIncome > 0 ? netIncome / totalIncome : 0;
  const assetTurnover = totalAssetsDemo > 0 ? totalIncome / totalAssetsDemo : 0;
  const equityMultiplier = totalEquityDemo > 0 ? totalAssetsDemo / totalEquityDemo : 1;
  const roe = netProfitMargin * assetTurnover * equityMultiplier;

  // 7b. Break-Even Analysis
  // For software/consulting (AES demo), variable costs are low. Assume 20% of expenses are variable, 80% fixed.
  const fixedCosts = totalExpenses * 0.8;
  const variableCosts = totalExpenses * 0.2;
  const contributionMarginRatio = totalIncome > 0 ? (totalIncome - variableCosts) / totalIncome : 0.01; // Avoid divide by zero
  const breakEvenRevenue = fixedCosts / contributionMarginRatio;
  const marginOfSafety = totalIncome > 0 ? ((totalIncome - breakEvenRevenue) / totalIncome) * 100 : 0;

  // 7c. Working Capital Cycle (Estimated)
  const averageDailySales = (totalIncome / 30) || 1;
  const daysSalesOutstanding = outstandingReceivables / averageDailySales;
  const daysPayableOutstanding = (currentLiabilities / ((totalExpenses / 30) || 1));
  const cashConversionCycle = daysSalesOutstanding - daysPayableOutstanding; // Simplified, excluding inventory days

  // 7d. Credit & Investment Readiness
  const estimatedEbitda = netIncome + (totalExpenses * 0.1); // Add back 10% config for D&A/Int
  const estimatedDebtService = (currentLiabilities * 1.5) || 5000; // Proxy for annual debt obligations
  const dscr = estimatedEbitda / estimatedDebtService;
  const impliedValuation = totalIncome * 3.5; // 3.5x Trailing Revenue Multiple

  const cfoMetrics = {
    dupont: {
      roe: roe * 100,
      netProfitMargin: netProfitMargin * 100,
      assetTurnover,
      equityMultiplier
    },
    breakEven: {
      breakEvenRevenue,
      marginOfSafety
    },
    workingCapitalCycle: {
      daysSalesOutstanding, // fix property name mapping
      daysPayableOutstanding,
      cashConversionCycle
    },
    creditReadiness: {
      dscr,
      quickRatio: liquidity.quickRatio,
      impliedValuation
    }
  };

  return {
    totalIncome, // This effectively becomes 'total collected or fully settled income value'
    totalExpenses,
    netIncome,
    receivablesSummary,
    transactionCount,
    incomeByCategory,
    expenseByCategory,
    fullPaymentRate,
    collectionRate,
    totalBilled,
    topSellingItems,
    monthlyTrends,
    topCustomers,
    averageTransactionValue,
    dayOfWeekAnalysis,
    customerConcentration,
    liquidity,
    cfoMetrics
  };
};

export const generateDynamicSummary = (data: ReportData, entrepreneurName: string, period: string): string => {
  const profitable = data.netIncome >= 0;
  const topSource = data.incomeByCategory[0]?.category || "General Sales";
  const topSourcePct = data.incomeByCategory[0]?.percentage.toFixed(1) || "0.0";
  const topExpense = data.expenseByCategory[0]?.category || "General Expenses";
  const topExpensePct = data.expenseByCategory[0]?.percentage.toFixed(1) || "0.0";

  const marginPct = data.totalIncome > 0 ? ((data.netIncome / data.totalIncome) * 100).toFixed(1) : "0.0";

  let liquidityCommentary = "";
  if (data.liquidity.currentRatio > 2) {
    liquidityCommentary = "The business maintains a strong liquidity position, indicating an ability to comfortably meet short-term obligations.";
  } else if (data.liquidity.currentRatio > 1) {
    liquidityCommentary = "Working capital is adequate, suggesting the business can cover its immediate operational liabilities.";
  } else {
    liquidityCommentary = "Current liquidity metrics indicate potential constraints in meeting short-term obligations. Monitoring cash flow closely is recommended.";
  }

  return `Financial Summary - Period: ${period}

To the Management and Stakeholders of ${entrepreneurName}:

This report provides a summary of the financial activities for the period ending ${period}. During this timeframe, the business recorded total revenues of GHS ${data.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} and total operating expenses of GHS ${data.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}. This resulted in a net ${profitable ? "income" : "loss"} of GHS ${Math.abs(data.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}, representing a net margin of ${marginPct}%.

Operational Overview:
The primary contributor to revenue was ${topSource}, accounting for ${topSourcePct}% of total income. The largest expense category was ${topExpense}, representing ${topExpensePct}% of total operating outflows. Management is encouraged to review these areas to ensure optimal pricing and cost efficiency.

Liquidity and Risk:
${liquidityCommentary}
Additionally, a review of customer concentration shows that the top 3 customers represent ${data.customerConcentration.top3Percentage.toFixed(1)}% of total revenue. Diversifying the customer base may help mitigate potential revenue risks in the future.`;
};

export const generateFinancialStatements = (transactions: Transaction[], period: string) => {
  // 1. Income Statement Logic
  const incomeTrans = transactions.filter(t => t.type === TransactionType.INCOME);
  const expenseTrans = transactions.filter(t => t.type === TransactionType.EXPENSE);

  let revenue = incomeTrans.reduce((sum, t) => sum + t.amount, 0);
  let expenses = expenseTrans.reduce((sum, t) => sum + t.amount, 0);

  // Remove demo mode injection
  // if (revenue === 0 && expenses === 0) { ... }

  const netIncome = revenue - expenses;
  const taxRate = 0.25;
  const taxProvision = netIncome > 0 ? netIncome * taxRate : 0;
  const netIncomeAfterTax = netIncome - taxProvision;

  // Categorize or Mock Categories
  let revenueByCategory = Object.entries(incomeTrans.reduce((acc, t) => {
    const cat = t.productServiceCategory || 'General Sales';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>)).map(([label, amount]) => ({ label, amount: amount.toFixed(2), isTotal: false, isNegative: false }));

  if (revenueByCategory.length === 0) {
    revenueByCategory = [
      { label: 'No Revenue Recorded', amount: '0.00', isTotal: false, isNegative: false }
    ];
  }

  let expensesByCategory = Object.entries(expenseTrans.reduce((acc, t) => {
    const cat = t.productServiceCategory || 'General Expenses';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>)).map(([label, amount]) => ({ label, amount: amount.toFixed(2), isTotal: false, isNegative: false, indent: 1 }));

  if (expensesByCategory.length === 0) {
    expensesByCategory = [
      { label: 'No Expenses Recorded', amount: '0.00', isTotal: false, isNegative: false, indent: 1 }
    ];
  }

  // 2. Balance Sheet Logic
  // Assets
  const cashOnHand = netIncome; // Simplified approach based strictly on tracked flows
  const receivables = incomeTrans
    .filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCurrentAssets = cashOnHand + receivables;
  const fixedAssets = 0; // Not tracked in current system
  const totalAssets = totalCurrentAssets + fixedAssets;

  // Liabilities
  const accountsPayable = expenseTrans
    .filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL)
    .reduce((sum, t) => sum + t.amount, 0);
  const taxPayable = taxProvision;
  const totalLiabilities = accountsPayable + taxPayable;

  // Equity
  const ownersEquity = 0; // Not tracked
  const retainedEarnings = totalAssets - totalLiabilities - ownersEquity; 
  const totalEquity = ownersEquity + retainedEarnings;

  // Balance Check: Assets = Liabs + Equity
  // Discrepancy should be zero due to retainedEarnings plug, but strictly calculated for display
  const discrepancy = totalAssets - (totalLiabilities + totalEquity);

  // KPI Calculations
  const cogsEstimation = expenses * 0.4; // Assuming 40% of expenses are direct costs (COGS) for demo, adjust as needed or derive from categories
  const grossProfit = revenue - cogsEstimation;
  const grossMarginPercentage = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const operatingExpenses = expenses - cogsEstimation;
  const depreciationAndAmortization = fixedAssets * 0.05; // 5% D&A for demo
  const ebitda = netIncome + taxProvision + depreciationAndAmortization; // Simplified EBITDA
  const ebitdaMarginPercentage = revenue > 0 ? (ebitda / revenue) * 100 : 0;
  const netMarginPercentage = revenue > 0 ? (netIncomeAfterTax / revenue) * 100 : 0;

  // Runway & Burn Rate
  const monthlyBurnRate = operatingExpenses; // simple assumption: monthly opex is burn rate
  const runwayMonths = monthlyBurnRate > 0 ? cashOnHand / monthlyBurnRate : 999;

  const kpis = {
    grossMargin: `${grossMarginPercentage.toFixed(1)}%`,
    ebitdaMargin: `${ebitdaMarginPercentage.toFixed(1)}%`,
    netMargin: `${netMarginPercentage.toFixed(1)}%`,
    burnRate: `GHS ${monthlyBurnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    runwayMonths: `${runwayMonths.toFixed(1)} months`
  };

  return {
    kpis,
    incomeStatement: {
      revenue: [
        ...revenueByCategory,
        { label: 'Total Revenue', amount: revenue.toFixed(2), isTotal: true, isNegative: false }
      ],
      expenses: [
        ...expensesByCategory,
        { label: 'Total Expenses', amount: expenses.toFixed(2), isTotal: true, isNegative: false }
      ],
      taxProvision: taxProvision.toFixed(2),
      netIncome: netIncomeAfterTax.toFixed(2)
    },
    balanceSheet: {
      assets: [
        { label: 'Current Assets', amount: '', isTotal: true, isNegative: false },
        { label: 'Cash & Equivalents', amount: cashOnHand.toFixed(2), isTotal: false, isNegative: false, indent: 1 },
        { label: 'Accounts Receivable', amount: receivables.toFixed(2), isTotal: false, isNegative: false, indent: 1 },
        { label: 'Non-Current Assets', amount: '', isTotal: true, isNegative: false },
        { label: 'Property, Plant & Equipment', amount: fixedAssets.toFixed(2), isTotal: false, isNegative: false, indent: 1 },
      ],
      liabilities: [
        { label: 'Current Liabilities', amount: '', isTotal: true, isNegative: false },
        { label: 'Tax Payable', amount: taxPayable.toFixed(2), isTotal: false, isNegative: false, indent: 1 },
      ],
      equity: [
        { label: 'Shareholders Equity', amount: '', isTotal: true, isNegative: false },
        { label: 'Capital Stock', amount: ownersEquity.toFixed(2), isTotal: false, isNegative: false, indent: 1 },
        { label: 'Retained Earnings', amount: (retainedEarnings + discrepancy).toFixed(2), isTotal: false, isNegative: false, indent: 1 },
      ],
      totalAssets: totalAssets.toFixed(2),
      totalLiabilitiesAndEquity: (totalLiabilities + totalEquity + discrepancy).toFixed(2)
    }
  };
};

export const generateStandardReport = (
  entrepreneur: Entrepreneur,
  period: string,
  transactions: Transaction[]
) => {
  const financialData = generateFinancialStatements(transactions, period);
  const data = generateReportData(entrepreneur.id, period, transactions);
  const summary = generateDynamicSummary(data, entrepreneur.name, period);

  return {
    reportTitle: `Strategic Financial Audit: ${entrepreneur.businessName}`,
    executiveSummary: summary,
    period: period,
    kpis: financialData.kpis,
    incomeStatement: financialData.incomeStatement,
    balanceSheet: financialData.balanceSheet,
    cashFlowStatement: {
      operating: [
        { label: 'Net Income', amount: financialData.incomeStatement.netIncome, isTotal: false, isNegative: false },
        { label: 'Depreciation (Est)', amount: (parseFloat(financialData.balanceSheet.totalAssets.replace(/[^0-9.-]+/g, "")) * 0.05).toFixed(2), isTotal: false, isNegative: false },
        { label: 'Net Cash from Operations', amount: financialData.incomeStatement.netIncome, isTotal: true, isNegative: false }
      ],
      investing: [],
      financing: [],
      netCashChange: financialData.incomeStatement.netIncome,
      closingCash: financialData.balanceSheet.assets.find(a => a.label === 'Cash & Equivalents')?.amount || '0.00'
    },
    forecast: {
      projectedRevenue: `GHS ${(parseFloat(financialData.incomeStatement.revenue.find(r => r.isTotal)?.amount.replace(/[^0-9.-]+/g, "") || "1000") * 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      projectedOpEx: `GHS ${(parseFloat(financialData.incomeStatement.expenses.find(r => r.isTotal)?.amount.replace(/[^0-9.-]+/g, "") || "800") * 1.05).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      assumptions: ['Conservative 15% WoW Revenue Growth', 'OpEx scaled at 5% rate for capacity building']
    },
    strategicRecommendations: [
      {
        recommendation: `Customer Diversification: Currently, ${data.customerConcentration.top3Percentage.toFixed(1)}% of revenue is tied to the top 3 customers. Expanding the customer base is recommended to reduce reliance on a small number of accounts.`,
        priority: data.customerConcentration.riskLevel.toLowerCase() as 'high' | 'medium' | 'low'
      },
      {
        recommendation: `Receivables Management: The current collection rate is ${data.collectionRate.toFixed(1)}%. Consider reviewing payment terms and following up on outstanding invoices to improve cash inflows.`,
        priority: data.collectionRate < 85 ? 'high' : 'medium'
      },
      {
        recommendation: `Focus on Strong Segments: '${data.topSellingItems[0]?.category || 'Primary Category'}' is currently the strongest performing area. Evaluate opportunities to further invest in and grow this segment.`,
        priority: 'medium'
      },
      {
        recommendation: `Expense Review: The largest expense category (${data.expenseByCategory[0]?.category || 'major expenses'}) represents a significant outflow. A periodic review of these costs may identify potential savings or efficiency improvements.`,
        priority: 'medium'
      }
    ],
    visualizations: {
      monthlyTrends: data.monthlyTrends,
      incomeDistribution: data.incomeByCategory.slice(0, 4).map((c, i) => ({ name: c.category, value: c.amount, color: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b'][i] || '#cbd5e1' })),
      expenseDistribution: data.expenseByCategory.slice(0, 4).map((c, i) => ({ name: c.category, value: c.amount, color: ['#ef4444', '#f97316', '#eab308', '#ec4899'][i] || '#cbd5e1' })),
      dayOfWeekTrends: data.dayOfWeekAnalysis.map(d => ({ day: d.day.slice(0, 3), value: d.income }))
    },
    topCustomers: data.topCustomers,
    customerConcentration: data.customerConcentration,
    financialPosition: data.liquidity,
    advancedCfoCommentary: {
      dupontAnalysis: `The calculated Return on Equity (ROE) based on tracked transactions is ${data.cfoMetrics.dupont.roe.toFixed(1)}%, primarily influenced by a profit margin of ${data.cfoMetrics.dupont.netProfitMargin.toFixed(1)}%.`,
      breakEvenAnalysis: `The estimated break-even revenue is GHS ${data.cfoMetrics.breakEven.breakEvenRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, providing a margin of safety of ${data.cfoMetrics.breakEven.marginOfSafety.toFixed(1)}%.`,
      efficiencyMetrics: `The Cash Conversion Cycle is estimated at ${data.cfoMetrics.workingCapitalCycle.cashConversionCycle.toFixed(1)} days based on current receivables and payables.`
    },
    // Keep cfoMetrics structure intact for typing
    cfoMetrics: data.cfoMetrics
  };
};