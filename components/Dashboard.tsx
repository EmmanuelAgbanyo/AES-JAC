import React, { useState, useMemo } from 'react';
import type { Entrepreneur, Transaction } from '../types';
import { TransactionType } from '../constants';
import StatCard from './Dashboard/StatCard';
import PerformanceChart from './Dashboard/PerformanceChart';
import RecentActivity from './Dashboard/RecentActivity';

interface DashboardProps {
    entrepreneurs: Entrepreneur[];
    transactions: Transaction[];
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: 'all', label: 'All Time' },
];

const getPeriodDates = (range: DateRange) => {
    const end = new Date();
    const start = new Date();
    end.setHours(23, 59, 59, 999);

    switch (range) {
        case '7d':
            start.setDate(end.getDate() - 6);
            break;
        case '30d':
            start.setDate(end.getDate() - 29);
            break;
        case '90d':
            start.setDate(end.getDate() - 89);
            break;
        case 'all':
            return { start: new Date(0), end };
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
};

const getPreviousPeriodDates = (range: DateRange, currentStart: Date) => {
    if (range === 'all') return { start: new Date(0), end: new Date(0) };

    const diff = (new Date()).getTime() - currentStart.getTime();
    const end = new Date(currentStart.getTime() - 1);
    const start = new Date(end.getTime() - diff);
    return { start, end };
};

const Dashboard = ({ entrepreneurs, transactions }: DashboardProps) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    const {
        currentStats,
        previousStats,
        chartData,
        recentActivities,
        topEntrepreneurs
    } = useMemo(() => {
        const { start, end } = getPeriodDates(dateRange);
        const { start: prevStart, end: prevEnd } = getPreviousPeriodDates(dateRange, start);

        const filterItemsByDate = <T extends Transaction | Entrepreneur>(items: T[], s: Date, e: Date, dateKey: 'date' | 'startDate'): T[] => {
            return items.filter(item => {
                const itemDate = new Date(item[dateKey]);
                return itemDate >= s && itemDate <= e;
            });
        };

        const filteredTransactions = filterItemsByDate(transactions, start, end, 'date');
        const previousTransactions = filterItemsByDate(transactions, prevStart, prevEnd, 'date');
        const newEntrepreneursInPeriod = filterItemsByDate(entrepreneurs, start, end, 'startDate');

        const calculateStats = (trans: Transaction[], entr: Entrepreneur[]) => {
            const totalIncome = trans.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = trans.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return {
                totalIncome,
                totalExpenses,
                netIncome: totalIncome - totalExpenses,
                newEntrepreneurs: entr.length,
            };
        };

        const cStats = calculateStats(filteredTransactions, newEntrepreneursInPeriod);
        const pStats = calculateStats(previousTransactions, []); // Not comparing new entrepreneurs for simplicity

        // Chart Data Aggregation
        const daysInRange = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
        const aggregateBy = daysInRange > 45 ? 'month' : 'day';

        const dataMap = new Map<string, { income: number, expense: number }>();
        filteredTransactions.forEach(t => {
            const key = aggregateBy === 'day' ? t.date : t.date.slice(0, 7);
            if (!dataMap.has(key)) dataMap.set(key, { income: 0, expense: 0 });
            const entry = dataMap.get(key)!;
            if (t.type === TransactionType.INCOME) entry.income += t.amount;
            else entry.expense += t.amount;
        });

        const cData = Array.from(dataMap.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([dateKey, values]) => ({
                name: aggregateBy === 'day'
                    ? new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : new Date(dateKey + '-02').toLocaleString('default', { month: 'short', year: 'numeric' }),
                Income: values.income,
                Expenses: values.expense,
                'Net Income': values.income - values.expense
            }));

        const rActivities = [
            ...filteredTransactions.map(t => ({ date: t.date, type: 'transaction' as const, data: t })),
            ...newEntrepreneursInPeriod.map(e => ({ date: e.startDate, type: 'entrepreneur' as const, data: e }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

        const tEntrepreneurs = entrepreneurs.map(e => {
            const income = filteredTransactions
                .filter(t => t.entrepreneurId === e.id && t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);
            return { name: e.businessName, income };
        }).filter(e => e.income > 0).sort((a, b) => b.income - a.income).slice(0, 5);

        return {
            currentStats: cStats,
            previousStats: pStats,
            chartData: cData,
            recentActivities: rActivities,
            topEntrepreneurs: tEntrepreneurs,
        };
    }, [dateRange, transactions, entrepreneurs]);

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            {/* Header Section - Floating Glass */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl shadow-indigo-500/10 mb-8 animate-slideUp relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-aesBlue to-indigo-600 dark:from-blue-400 dark:to-indigo-300 mb-2 tracking-tight">
                        Welcome back, <span className="text-gray-900 dark:text-white">Admin</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Here's what's happening with your entrepreneurs today.</p>
                </div>
                <div className="bg-white/80 dark:bg-black/50 p-1.5 rounded-2xl shadow-inner border border-white/40 dark:border-white/10 flex items-center backdrop-blur-md relative z-10">
                    {DATE_RANGE_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setDateRange(opt.key)}
                            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${dateRange === opt.key
                                ? 'bg-gradient-to-r from-aesBlue to-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-100'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
                <StatCard title="Total Income" value={currentStats.totalIncome} previousValue={previousStats.totalIncome} formatAs="currency" />
                <StatCard title="Total Expenses" value={currentStats.totalExpenses} previousValue={previousStats.totalExpenses} formatAs="currency" isExpense />
                <StatCard title="Net Income" value={currentStats.netIncome} previousValue={previousStats.netIncome} formatAs="currency" />
                <StatCard title="Active Entrepreneurs" value={currentStats.newEntrepreneurs} previousValue={previousStats.newEntrepreneurs} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="xl:col-span-2 bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-white/50 dark:border-white/10 hover:border-white/80 dark:hover:border-white/20 transition-colors duration-500 animate-slideUp group" style={{ animationDelay: '200ms' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Financial Performance</h3>
                        <button className="text-sm font-bold text-aesBlue hover:text-indigo-700 transition-colors bg-blue-50/50 dark:bg-white/5 px-4 py-2 rounded-xl hover:bg-blue-100/50 border border-blue-100 dark:border-white/5">Download Report</button>
                    </div>
                    <PerformanceChart data={chartData} />
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8 animate-slideUp" style={{ animationDelay: '300ms' }}>
                    <RecentActivity activities={recentActivities} entrepreneurs={entrepreneurs} />

                    {/* Top Entrepreneurs Card */}
                    <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-white/50 dark:border-white/10 hover:border-white/80 dark:hover:border-white/20 transition-colors duration-500 group">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-yellow-400/20 to-amber-600/20 rounded-lg ring-1 ring-yellow-400/30">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                                Top Performers
                            </h3>
                            <button className="text-xs font-bold text-aesBlue hover:text-indigo-700 transition-colors bg-blue-50/50 dark:bg-white/5 px-3 py-1.5 rounded-lg hover:bg-blue-100/50 border border-blue-100 dark:border-white/5">View All</button>
                        </div>

                        {topEntrepreneurs.length > 0 ? (
                            <ul className="space-y-3">
                                {topEntrepreneurs.map((e, index) => (
                                    <li key={index} className="flex justify-between items-center p-3 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/50 dark:hover:border-white/20 group/item hover:-translate-y-0.5 hover:shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-transform group-hover/item:scale-110 duration-300 ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-white ring-2 ring-yellow-400/50' :
                                                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white ring-2 ring-slate-400/50' :
                                                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-2 ring-amber-600/50' :
                                                        'bg-white/50 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{e.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                            GHS {e.income.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-gray-500 py-8 italic">No revenue recorded yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
