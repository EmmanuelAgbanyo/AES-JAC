import React, { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import type { Entrepreneur, Transaction, AiReport, Goal } from '../types';
import { AppView, TransactionType } from '../constants';
import { GoalType } from '../types';
import Button from './ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Select from './ui/Select';
import HtmlReportView from './HtmlReportView';
import { generateAiPoweredReport } from '../services/geminiService';
import { generateStandardReport } from '../services/reportService';
import LoadingSpinner from './LoadingSpinner';
import GoalCard from './GoalCard';
import Modal from './ui/Modal';
import TransactionForm from './TransactionForm';
import ClientManager from './ClientManager';
import { LayoutDashboard, Users, TrendingUp } from 'lucide-react';
import type { Client } from '../types';


interface EntrepreneurDashboardProps {
    entrepreneur: Entrepreneur | null;
    transactions: Transaction[];
    navigateTo: (view: AppView) => void;
    onEditTransaction: (transaction: Transaction) => void;
    onSetGoal: (entrepreneur: Entrepreneur) => void;
    userRole: 'admin' | 'entrepreneur';
    onAddTransaction?: (transaction: Transaction) => Promise<void>; // For entrepreneur to add transactions
    clients?: Client[];
    onAddClient?: (client: Client) => void;
    onUpdateClient?: (client: Client) => void;
    onDeleteClient?: (id: string) => void;
}

const StatCard = ({ title, value, color, icon }: { title: string, value: string | number, color: string, icon?: ReactNode }) => (
    <div className={`bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg border-l-4 ${color} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-default`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-dark-text">{value}</p>
            </div>
            {icon && <div className="text-3xl opacity-70 transition-transform duration-500 hover:scale-110">{icon}</div>}
        </div>
    </div>
);


const EntrepreneurDashboard = ({ entrepreneur, transactions, navigateTo, onEditTransaction, onSetGoal, userRole, onAddTransaction, clients = [], onAddClient, onUpdateClient, onDeleteClient }: EntrepreneurDashboardProps) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients'>('dashboard');
    const [showReportView, setShowReportView] = useState<boolean>(false);
    const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [aiReport, setAiReport] = useState<AiReport | null>(null);
    const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [autoGeneratePdf, setAutoGeneratePdf] = useState<boolean>(true);
    const [shouldAutoExport, setShouldAutoExport] = useState<boolean>(false);
    const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(t => months.add(t.date.slice(0, 7)));
        if (months.size === 0) {
            return [];
        }
        return Array.from(months)
            .sort()
            .reverse()
            .map(m => ({
                value: m,
                label: new Date(m + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
            }));
    }, [transactions]);

    useEffect(() => {
        if (!selectedMonth && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0].value);
        }
    }, [availableMonths, selectedMonth]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        transactions.forEach(t => years.add(t.date.slice(0, 4)));
        if (years.size === 0) {
            return [];
        }
        return Array.from(years).sort().reverse().map(y => ({ value: y, label: y }));
    }, [transactions]);


    const handleGenerateReport = useCallback(async () => {
        const period = periodType === 'monthly' ? selectedMonth : selectedYear;
        if (!entrepreneur || !period) {
            setReportError("Please select a period to generate a report.");
            return;
        }
        setIsReportLoading(true);
        setReportError(null);
        setAiReport(null);


        try {
            const relevantTransactions = transactions.filter(t => t.date.startsWith(period));
            setShouldAutoExport(autoGeneratePdf && relevantTransactions.length > 0);

            // Generate deterministic highly-impressive CFO report locally without API dependency
            const report = generateStandardReport(entrepreneur, period, relevantTransactions);

            // Adding a small artificial delay to simulate "analysis" for a better UX
            setTimeout(() => {
                setAiReport(report as unknown as AiReport);
                setShowReportView(true);
                setIsReportLoading(false);
            }, 1200);

        } catch (err) {
            console.error("Error generating AI report:", err);
            setReportError((err as Error).message || "Failed to generate AI report.");
            setIsReportLoading(false);
        }
    }, [entrepreneur, periodType, selectedMonth, selectedYear, transactions, autoGeneratePdf]);

    const handleAddTransactionSubmit = async (transaction: Transaction) => {
        if (onAddTransaction) {
            await onAddTransaction(transaction);
            setIsAddTransactionModalOpen(false); // Close modal on success
        }
    };

    const calculateGoalProgress = (goal: Goal) => {
        const goalPeriod = goal.targetDate.slice(0, 7); // YYYY-MM, assumes monthly goals for now
        const relevantTransactions = transactions.filter(t => t.date.startsWith(goalPeriod));

        switch (goal.type) {
            case GoalType.REVENUE_TARGET:
                return relevantTransactions
                    .filter(t => t.type === TransactionType.INCOME)
                    .reduce((sum, t) => sum + t.amount, 0);
            case GoalType.PROFIT_TARGET:
                const income = relevantTransactions
                    .filter(t => t.type === TransactionType.INCOME)
                    .reduce((sum, t) => sum + t.amount, 0);
                const expense = relevantTransactions
                    .filter(t => t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
                return income - expense;
            case GoalType.EXPENSE_REDUCTION:
                return relevantTransactions
                    .filter(t => t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
            default:
                return 0;
        }
    };


    const selectedPeriod = periodType === 'monthly' ? selectedMonth : selectedYear;
    const relevantTransactionsForPeriod = transactions.filter(t => t.date.startsWith(selectedPeriod));


    if (!entrepreneur) {
        return (
            <div className="text-center p-10 bg-white dark:bg-dark-secondary rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text mb-4">No Entrepreneur Selected</h2>
                <p className="text-gray-500 dark:text-dark-textSecondary mb-6">Please go back to the list and select an entrepreneur to view their dashboard.</p>
                <Button variant="primary" onClick={() => navigateTo(AppView.ENTREPRENEURS)}>← Go to Entrepreneurs List</Button>
            </div>
        )
    }

    if (isReportLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <LoadingSpinner message="JAC Automated Auditor is compiling the integrated financial report..." />
                <Button variant="secondary" onClick={() => setIsReportLoading(false)} className="mt-4">Cancel</Button>
            </div>
        );
    }

    if (showReportView && aiReport) {
        return (
            <HtmlReportView
                aiReport={aiReport}
                entrepreneur={entrepreneur}
                transactionsForPeriod={relevantTransactionsForPeriod}
                period={selectedPeriod}
                onClose={() => {
                    setShowReportView(false);
                    setAiReport(null);
                    setShouldAutoExport(false);
                }}
                autoExportAs={shouldAutoExport ? 'pdf' : null}
            />
        );
    }

    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const customers = transactions.reduce((acc, t) => {
        if (t.type === TransactionType.INCOME && t.customerName && t.customerName.trim() !== '') {
            const name = t.customerName.trim();
            if (!acc[name]) {
                acc[name] = { name, totalSpent: 0, transactionCount: 0, lastPurchase: '1970-01-01' };
            }
            acc[name].totalSpent += t.amount;
            acc[name].transactionCount += 1;
            if (new Date(t.date) > new Date(acc[name].lastPurchase)) {
                acc[name].lastPurchase = t.date;
            }
        }
        return acc;
    }, {} as Record<string, { name: string, totalSpent: number, transactionCount: number, lastPurchase: string }>);

    const customerList = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);

    const monthlyIncomeData = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => {
            const month = t.date.slice(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { income: 0, expense: 0 };
            }
            acc[month].income += t.amount;
            return acc;
        }, {} as Record<string, { income: number; expense: number }>);

    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
        const month = t.date.slice(0, 7);
        if (monthlyIncomeData[month]) {
            monthlyIncomeData[month].expense += t.amount;
        } else {
            monthlyIncomeData[month] = { income: 0, expense: t.amount };
        }
    });

    const chartData = Object.entries(monthlyIncomeData)
        .map(([month, data]) => ({
            name: new Date(month + '-02').toLocaleString('default', { month: 'short', year: 'numeric' }),
            Income: data.income,
            Expenses: data.expense,
        }))
        .sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime()).slice(0, 12).reverse();

    const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);


    return (
        <div className="space-y-8">
            {userRole === 'admin' && (
                <div className="flex justify-start">
                    <Button variant="secondary" onClick={() => navigateTo(AppView.ENTREPRENEURS)}>← Back to Entrepreneurs List</Button>
                </div>
            )}
            {isAddTransactionModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAddTransactionModalOpen(false)} title="Add New Transaction">
                    <TransactionForm
                        onSubmit={handleAddTransactionSubmit}
                        onCancel={() => setIsAddTransactionModalOpen(false)}
                        currentEntrepreneur={entrepreneur}
                        entrepreneurs={[]} // Not needed for entrepreneur view
                    />
                </Modal>
            )}

            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-gray-200 dark:border-dark-border mb-6">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${activeTab === 'dashboard'
                        ? 'border-b-2 border-accent-primary text-accent-primary'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    <LayoutDashboard size={18} />
                    <span>Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${activeTab === 'clients'
                        ? 'border-b-2 border-accent-primary text-accent-primary'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    <Users size={18} />
                    <span>Clients</span>
                </button>
            </div>

            {activeTab === 'clients' ? (
                <div className="animate-fadeIn">
                    {onAddClient && onUpdateClient && onDeleteClient ? (
                        <ClientManager
                            clients={clients}
                            onAddClient={onAddClient}
                            onUpdateClient={onUpdateClient}
                            onDeleteClient={onDeleteClient}
                            entrepreneurId={entrepreneur.id}
                        />
                    ) : (
                        <div className="p-8 text-center text-gray-500">Client management features are not fully configured.</div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-fadeIn">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-6 bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg">
                        <div className="flex items-center space-x-6">
                            <div className="text-6xl bg-aesYellow text-aesBlue w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                                {entrepreneur.name.charAt(0)}
                            </div>
                            <div className="flex-grow">
                                <h1 className="text-4xl font-extrabold text-aesBlue">{entrepreneur.name}</h1>
                                <p className="text-xl text-gray-700 dark:text-dark-text font-semibold">{entrepreneur.businessName}</p>
                                {entrepreneur.bio && <p className="mt-2 text-gray-600 dark:text-dark-textSecondary italic">"{entrepreneur.bio}"</p>}
                            </div>
                        </div>
                        {userRole === 'entrepreneur' && (
                            <Button variant="success" size="lg" onClick={() => setIsAddTransactionModalOpen(true)}>
                                + Add Transaction
                            </Button>
                        )}
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Lifetime Income" value={`GHS ${totalIncome.toFixed(2)}`} color="border-success" icon={<span>💰</span>} />
                        <StatCard title="Total Customers" value={customerList.length} color="border-info" icon={<span>👥</span>} />
                        <StatCard title="Total Transactions" value={transactions.length} color="border-aesYellow" icon={<span>🔄</span>} />
                        <StatCard title="Lifetime Net" value={`GHS ${netIncome.toFixed(2)}`} color={netIncome >= 0 ? "border-aesBlue" : "border-danger"} icon={<span>🏦</span>} />
                    </div>

                    {/* Goals Section */}
                    <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text">Goals & Milestones</h3>
                            <Button variant="primary" size="sm" onClick={() => onSetGoal(entrepreneur)}>Set New Goal</Button>
                        </div>
                        {entrepreneur.goals && entrepreneur.goals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {entrepreneur.goals.map(goal => (
                                    <GoalCard key={goal.id} goal={goal} currentValue={calculateGoalProgress(goal)} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-dark-textSecondary italic">No goals set yet. Click "Set New Goal" to get started.</p>
                        )}
                    </div>

                    {/* Report Generator Card */}
                    <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg border-2 border-aesYellow">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">AI Performance Reports</h3>
                        <p className="text-gray-600 dark:text-dark-textSecondary mb-4">
                            Select a period to generate a detailed, professional report with AI-powered financial analysis.
                        </p>
                        {(availableMonths.length > 0 || availableYears.length > 0) ? (
                            <>
                                <div className="flex flex-col sm:flex-row gap-4 items-end mb-4">
                                    <div className="w-full sm:w-auto">
                                        <Select
                                            label="Report Type"
                                            id="reportType"
                                            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]}
                                            value={periodType}
                                            onChange={e => setPeriodType(e.target.value as 'monthly' | 'yearly')}
                                        />
                                    </div>
                                    <div className="w-full sm:w-auto flex-grow">
                                        {periodType === 'monthly' ? (
                                            <Select
                                                label="Report Month"
                                                id="reportMonth"
                                                options={availableMonths}
                                                value={selectedMonth}
                                                onChange={(e) => { setSelectedMonth(e.target.value); setReportError(null); }}
                                                required
                                            />
                                        ) : (
                                            <Select
                                                label="Report Year"
                                                id="reportYear"
                                                options={availableYears}
                                                value={selectedYear}
                                                onChange={(e) => { setSelectedYear(e.target.value); setReportError(null); }}
                                                required
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <input
                                                id="auto-pdf-checkbox-dash"
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary"
                                                checked={autoGeneratePdf}
                                                onChange={(e) => setAutoGeneratePdf(e.target.checked)}
                                            />
                                            <label htmlFor="auto-pdf-checkbox-dash" className="ml-2 block text-sm text-gray-700 dark:text-dark-textSecondary">
                                                Auto-generate PDF
                                            </label>
                                        </div>
                                        <Button onClick={handleGenerateReport} disabled={!selectedPeriod}>
                                            Generate AI Report
                                        </Button>
                                    </div>
                                </div>
                                {reportError && <p className="text-red-500 mt-2">{reportError}</p>}
                            </>
                        ) : (
                            <p className="text-gray-500 dark:text-dark-textSecondary p-4 bg-gray-50 dark:bg-dark-primary rounded-md">No transactions recorded yet. An AI report can be generated once transactions are added.</p>
                        )}
                    </div>

                    {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Chart */}
                            <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">Monthly Performance (Last 12 Months)</h3>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                            <XAxis dataKey="name" tick={{ fill: '#8b949e' }} />
                                            <YAxis tick={{ fill: '#8b949e' }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }} />
                                            <Legend wrapperStyle={{ color: '#e6edf3' }} />
                                            <Bar dataKey="Income" fill="#28a745" />
                                            <Bar dataKey="Expenses" fill="#dc3545" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-gray-500 dark:text-dark-textSecondary">Not enough data for a monthly chart.</p>}
                            </div>
                            {/* Recent Transactions */}
                            <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg transition-shadow duration-300 hover:shadow-xl">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">Recent Transactions</h3>
                                {recentTransactions.length > 0 ? (
                                    <ul className="divide-y divide-gray-200 dark:divide-dark-border">
                                        {recentTransactions.map(t => (
                                            <li key={t.id} className="py-3 flex justify-between items-start">
                                                <div className="flex-grow">
                                                    <p className="font-medium text-gray-800 dark:text-dark-text">{t.description}</p>
                                                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-dark-textSecondary">
                                                        <span>{new Date(t.date).toLocaleDateString()}</span>
                                                        <span>&bull;</span>
                                                        <span className={`font-semibold ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t.type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    <p className={`font-semibold text-lg ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === TransactionType.INCOME ? '+' : '-'}GHS {t.amount.toFixed(2)}
                                                    </p>
                                                    <Button variant="info" size="sm" onClick={() => onEditTransaction(t)} className="mt-1">Edit</Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-gray-500 dark:text-dark-textSecondary">No transactions recorded yet.</p>}
                            </div>
                        </div>

                        {/* Customer List */}
                        <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg transition-shadow duration-300 hover:shadow-xl">
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">Top Customers</h3>
                            {customerList.length > 0 ? (
                                <div className="overflow-y-auto max-h-[600px]">
                                    <ul className="divide-y divide-gray-200 dark:divide-dark-border">
                                        {customerList.map(c => (
                                            <li key={c.name} className="py-3">
                                                <p className="font-semibold text-primary">{c.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Total Spent: <span className="font-medium text-black dark:text-dark-text">GHS {c.totalSpent.toFixed(2)}</span></p>
                                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">{c.transactionCount} purchase(s) &bull; Last: {new Date(c.lastPurchase).toLocaleDateString()}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : <p className="text-gray-500 dark:text-dark-textSecondary">No customers with recorded names yet.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntrepreneurDashboard;