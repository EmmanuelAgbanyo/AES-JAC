
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Entrepreneur, Transaction, AiReport } from '../types';
import { generateAiPoweredReport } from '../services/geminiService';
import { generateReportData, generateDynamicSummary } from '../services/reportService';
import Button from './ui/Button';
import Select from './ui/Select';
import LoadingSpinner from './LoadingSpinner';
import HtmlReportView from './HtmlReportView';
import { TransactionType } from '../constants';

interface ReportGeneratorProps {
  entrepreneurs: Entrepreneur[];
  transactions: Transaction[];
}

interface TransactionSummary {
  count: number;
  income: number;
  expenses: number;
}

const ReportGenerator = ({ entrepreneurs, transactions }: ReportGeneratorProps) => {
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  const [reportMode, setReportMode] = useState<'ai' | 'standard'>('ai');
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [aiReport, setAiReport] = useState<AiReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportContext, setReportContext] = useState<{ entrepreneur: Entrepreneur; transactions: Transaction[], period: string } | null>(null);
  const [autoGeneratePdf, setAutoGeneratePdf] = useState<boolean>(true);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);

  const entrepreneurOptions = entrepreneurs.map(e => ({ value: e.id, label: `${e.businessName} (${e.name})` }));

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => months.add(t.date.slice(0, 7)));
    if (months.size === 0) months.add(new Date().toISOString().slice(0, 7));
    return Array.from(months).sort().reverse().map(m => ({ value: m, label: new Date(m + "-02").toLocaleString('default', { month: 'long', year: 'numeric' }) }));
  }, [transactions]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => years.add(t.date.slice(0, 4)));
    if (years.size === 0) years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse().map(y => ({ value: y, label: y }));
  }, [transactions]);

  useEffect(() => {
    const period = periodType === 'monthly' ? selectedMonth : selectedYear;
    if (selectedEntrepreneurId && period) {
      const relevantTransactions = transactions.filter(t =>
        t.entrepreneurId === selectedEntrepreneurId && t.date.startsWith(period)
      );
      setTransactionSummary({
        count: relevantTransactions.length,
        income: relevantTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0),
        expenses: relevantTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0),
      });
    } else {
      setTransactionSummary(null);
    }
  }, [selectedEntrepreneurId, periodType, selectedMonth, selectedYear, transactions]);

  const handleGenerateReport = useCallback(async () => {
    const period = periodType === 'monthly' ? selectedMonth : selectedYear;
    const entrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);

    if (!entrepreneur) {
      setError("Please select an entrepreneur.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const relevantTransactions = transactions.filter(t => t.entrepreneurId === selectedEntrepreneurId && t.date.startsWith(period));

      let report: AiReport;

      if (reportMode === 'ai') {
        if (!process.env.API_KEY) throw new Error("Gemini API key not configured.");
        report = await generateAiPoweredReport(relevantTransactions, entrepreneur, period, entrepreneur.goals);
      } else {
        // Construct a "Standard" report using reportService logic
        const rawData = generateReportData(selectedEntrepreneurId, period, transactions);

        // Correctly structure the report object to satisfy the AiReport interface requirements
        // Fix: netIncome assigned as string, incomeStatement using revenue/expenses instead of steps
        report = {
          reportTitle: `Financial Summary: ${entrepreneur.businessName}`,
          executiveSummary: generateDynamicSummary(rawData, entrepreneur.businessName, period),
          period: period,
          kpis: {
            grossMargin: 'N/A',
            ebitdaMargin: 'N/A',
            netMargin: `${((rawData.netIncome / (rawData.totalIncome || 1)) * 100).toFixed(1)}%`,
            burnRate: `GHS ${rawData.totalExpenses.toFixed(2)}`,
            runwayMonths: 'N/A'
          },
          incomeStatement: {
            revenue: [
              { label: 'Total Revenue', amount: `GHS ${rawData.totalIncome.toFixed(2)}` }
            ],
            expenses: [
              { label: 'Total Expenses', amount: `GHS ${rawData.totalExpenses.toFixed(2)}`, isNegative: true }
            ],
            taxProvision: 'GHS 0.00',
            netIncome: `GHS ${rawData.netIncome.toFixed(2)}`
          },
          balanceSheet: {
            assets: [
              { label: 'Cash', amount: `GHS ${rawData.totalIncome.toFixed(2)}` },
              { label: 'Receivables', amount: `GHS ${rawData.receivablesSummary.total.toFixed(2)}` }
            ],
            liabilities: [],
            equity: [],
            totalAssets: `GHS ${(rawData.totalIncome + rawData.receivablesSummary.total).toFixed(2)}`,
            totalLiabilitiesAndEquity: `GHS ${(rawData.totalIncome + rawData.receivablesSummary.total).toFixed(2)}`
          },
          cashFlowStatement: {
            operating: [
              { label: 'Net Income', amount: `GHS ${rawData.netIncome.toFixed(2)}` }
            ],
            investing: [],
            financing: [],
            netCashChange: `GHS ${rawData.netIncome.toFixed(2)}`,
            closingCash: `GHS ${rawData.totalIncome.toFixed(2)}`
          },
          forecast: {
            projectedRevenue: 'N/A',
            projectedOpEx: 'N/A',
            assumptions: []
          },
          strategicRecommendations: [
            { recommendation: 'Ensure all receipts for expenses are logged promptly.', priority: 'medium' },
            { recommendation: 'Monitor net income trends to ensure business sustainability.', priority: 'high' }
          ],
          keyMetrics: [
            { metric: 'Total Income', value: `GHS ${rawData.totalIncome.toFixed(2)}`, insight: 'Total cash/revenue recorded.', sentiment: 'neutral' },
            { metric: 'Total Expenses', value: `GHS ${rawData.totalExpenses.toFixed(2)}`, insight: 'Total operational costs.', sentiment: 'neutral' },
            { metric: 'Net Profit', value: `GHS ${rawData.netIncome.toFixed(2)}`, insight: 'The remaining balance after costs.', sentiment: rawData.netIncome >= 0 ? 'positive' : 'negative' },
            { metric: 'Cust. Concentration', value: `${rawData.customerConcentration.top3Percentage.toFixed(1)}%`, insight: `Risk Level: ${rawData.customerConcentration.riskLevel}`, sentiment: rawData.customerConcentration.riskLevel === 'High' ? 'negative' : 'positive' }
          ],
          detailedAnalysis: [
            { title: 'Transaction Activity', analysis: `During this period, ${rawData.transactionCount.income} income and ${rawData.transactionCount.expense} expense transactions were processed.` },
            { title: 'Average Transaction Value', analysis: `The average income per transaction was GHS ${rawData.averageTransactionValue.toFixed(2)}.` },
            { title: 'Busiest Day', analysis: `The busiest day for revenue was ${rawData.dayOfWeekAnalysis.sort((a, b) => b.income - a.income)[0].day}.` }
          ],
          visualizations: {
            monthlyTrends: rawData.monthlyTrends,
            incomeDistribution: rawData.incomeByCategory.slice(0, 5).map((item, index) => ({
              name: item.category,
              value: item.amount,
              color: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]
            })),
            expenseDistribution: rawData.expenseByCategory.slice(0, 5).map((item, index) => ({
              name: item.category,
              value: item.amount,
              color: ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#82ca9d'][index % 5]
            })),
            dayOfWeekTrends: rawData.dayOfWeekAnalysis.map(d => ({ day: d.day, value: d.income }))
          },
          topCustomers: rawData.topCustomers,
          customerConcentration: rawData.customerConcentration
        };
      }

      setAiReport(report);
      setReportContext({ entrepreneur, transactions: relevantTransactions, period });

    } catch (err) {
      setError((err as Error).message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntrepreneurId, reportMode, periodType, selectedMonth, selectedYear, transactions, entrepreneurs]);

  if (isLoading) return <LoadingSpinner message="Generating report..." />;

  if (aiReport && reportContext) {
    return (
      <HtmlReportView
        aiReport={aiReport}
        entrepreneur={reportContext.entrepreneur}
        transactionsForPeriod={reportContext.transactions}
        period={reportContext.period}
        onClose={() => setAiReport(null)}
        autoExportAs={autoGeneratePdf ? 'pdf' : null}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6 animate-fadeIn pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white/60 dark:bg-black/20 backdrop-blur-2xl p-8 rounded-3xl border border-white/40 dark:border-white/5 shadow-xl">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2 tracking-tight">
            Report Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Generate professional financial audits and strategic insights.</p>
        </div>

        <div className="flex bg-white/50 dark:bg-white/5 p-1.5 rounded-2xl shadow-inner border border-white/20 dark:border-white/5 backdrop-blur-sm">
          <button
            onClick={() => setReportMode('ai')}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${reportMode === 'ai'
              ? 'bg-aesBlue text-white shadow-lg shadow-blue-500/20 scale-100'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'}`}
          >
            <span>✨</span> AI Strategic Audit
          </button>
          <button
            onClick={() => setReportMode('standard')}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${reportMode === 'standard'
              ? 'bg-aesBlue text-white shadow-lg shadow-blue-500/20 scale-100'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'}`}
          >
            <span>📊</span> Standard Data Report
          </button>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-black/20 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-white/40 dark:border-white/5 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-aesBlue/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8 items-end relative z-10">
          <div className="lg:col-span-1">
            <Select
              label="Entrepreneur / Business"
              id="selectedEntrepreneurId"
              options={entrepreneurOptions}
              value={selectedEntrepreneurId}
              onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
              required
            />
          </div>
          <Select
            label="Timeframe"
            id="reportType"
            options={[{ value: 'monthly', label: 'Monthly Report' }, { value: 'yearly', label: 'Yearly Summary' }]}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as 'monthly' | 'yearly')}
          />
          {periodType === 'monthly' ? (
            <Select
              label="Select Month"
              id="selectedMonth"
              options={availableMonths}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              required
            />
          ) : (
            <Select
              label="Select Year"
              id="selectedYear"
              options={availableYears}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              required
            />
          )}
        </div>

        {transactionSummary && (
          <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-white/5 rounded-2xl border border-white/50 dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
            <div className="text-center md:text-left">
              <h4 className="font-bold text-aesBlue uppercase tracking-widest text-[10px] mb-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">Period Preview</h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Found <span className="font-bold text-gray-900 dark:text-white">{transactionSummary.count}</span> transactions for this period.</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center group">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Income</p>
                <p className="text-lg font-bold text-green-600 bg-green-50 dark:bg-green-900/10 px-3 py-1 rounded-lg border border-green-100 dark:border-green-900/20 group-hover:scale-105 transition-transform">
                  GHS {transactionSummary.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center group">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expenses</p>
                <p className="text-lg font-bold text-red-600 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-lg border border-red-100 dark:border-red-900/20 group-hover:scale-105 transition-transform">
                  GHS {transactionSummary.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-gray-100 dark:border-white/5 relative z-10">
          <label className="flex items-center cursor-pointer group p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={autoGeneratePdf}
                onChange={(e) => setAutoGeneratePdf(e.target.checked)}
              />
              <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${autoGeneratePdf ? 'bg-aesBlue' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${autoGeneratePdf ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <span className="ml-3 text-sm font-semibold text-gray-600 dark:text-gray-300 group-hover:text-aesBlue transition-colors">Auto-generate PDF Export</span>
          </label>
          <Button
            size="lg"
            onClick={handleGenerateReport}
            disabled={!selectedEntrepreneurId}
            className="w-full md:w-auto shadow-xl shadow-aesBlue/20 hover:shadow-aesBlue/30 text-white font-bold py-3 px-8 rounded-xl bg-gradient-to-r from-aesBlue to-blue-600 border-0"
          >
            {isLoading ? 'Generating...' : `Generate ${reportMode === 'ai' ? 'AI Strategic' : 'Standard'} Audit`}
          </Button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-3 animate-slideUp">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
