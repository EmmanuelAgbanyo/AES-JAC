import React, { useState, useMemo } from 'react';
import type { Entrepreneur, Transaction } from '../types';
import { TransactionType } from '../constants';
import StatCard from './Dashboard/StatCard';
import PerformanceChart from './Dashboard/PerformanceChart';
import RecentActivity from './Dashboard/RecentActivity';
import { motion } from 'framer-motion';
import { Download, Trophy, Users } from 'lucide-react';

interface DashboardProps {
    entrepreneurs: Entrepreneur[];
    transactions: Transaction[];
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
    { key: 'all', label: 'All' },
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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
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
        <motion.div 
            className="space-y-8 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <motion.div 
                variants={itemVariants}
                className="flex flex-col md:flex-row justify-between md:items-end gap-6 bg-gradient-to-br from-white/90 to-white/50 dark:from-gray-900/90 dark:to-black/50 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-2xl shadow-indigo-500/5 relative overflow-hidden group"
            >
                {/* Decorative background blobs */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

                <div className="relative z-10 space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 dark:from-white dark:via-blue-200 dark:to-white tracking-tight">
                        Welcome back, Admin
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-medium flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" />
                        Overview of your entrepreneur network
                    </p>
                </div>
                
                <div className="bg-white/80 dark:bg-black/40 p-1.5 rounded-2xl shadow-sm border border-gray-200/50 dark:border-white/10 flex items-center backdrop-blur-xl relative z-10">
                    {DATE_RANGE_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setDateRange(opt.key)}
                            className="relative px-6 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 z-10"
                        >
                            {dateRange === opt.key && (
                                <motion.div 
                                    layoutId="active-pill" 
                                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/25"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className={`relative z-20 ${dateRange === opt.key ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Income" 
                    value={currentStats.totalIncome} 
                    previousValue={previousStats.totalIncome} 
                    formatAs="currency" 
                    icon="income"
                />
                <StatCard 
                    title="Total Expenses" 
                    value={currentStats.totalExpenses} 
                    previousValue={previousStats.totalExpenses} 
                    formatAs="currency" 
                    isExpense 
                    icon="expense"
                />
                <StatCard 
                    title="Net Income" 
                    value={currentStats.netIncome} 
                    previousValue={previousStats.netIncome} 
                    formatAs="currency" 
                    icon="net"
                />
                <StatCard 
                    title="Active Entrepreneurs" 
                    value={currentStats.newEntrepreneurs} 
                    previousValue={previousStats.newEntrepreneurs} 
                    icon="users"
                />
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Chart Section */}
                <motion.div variants={itemVariants} className="xl:col-span-2 bg-white/80 dark:bg-gray-900/50 backdrop-blur-2xl p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors duration-500 group">
                    <div className="flex justify-between items-center mb-8">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Financial Performance</h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue versus expenses over time</p>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 px-4 py-2.5 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 border border-indigo-100/50 dark:border-indigo-500/20">
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                    </div>
                    <PerformanceChart data={chartData} />
                </motion.div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    <motion.div variants={itemVariants}>
                        <RecentActivity activities={recentActivities} entrepreneurs={entrepreneurs} />
                    </motion.div>

                    {/* Top Entrepreneurs Card */}
                    <motion.div variants={itemVariants} className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-2xl p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors duration-500 group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-xl ring-1 ring-amber-400/30">
                                        <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    Top Performers
                                </h3>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-11">By generated revenue</p>
                            </div>
                        </div>

                        {topEntrepreneurs.length > 0 ? (
                            <ul className="space-y-4">
                                {topEntrepreneurs.map((e, index) => (
                                    <motion.li 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        key={index} 
                                        className="flex justify-between items-center p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300 group/item hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm transition-transform group-hover/item:scale-110 duration-300 ${
                                                index === 0 ? 'bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 text-white ring-2 ring-amber-400/50' :
                                                index === 1 ? 'bg-gradient-to-br from-slate-300 via-gray-400 to-slate-500 text-white ring-2 ring-slate-400/50' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 via-orange-600 to-orange-800 text-white ring-2 ring-orange-500/50' :
                                                'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/10'
                                            }`}>
                                                {index + 1}
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{e.name}</span>
                                        </div>
                                        <span className="font-extrabold text-gray-900 dark:text-white bg-white/80 dark:bg-black/40 px-4 py-2 rounded-xl border border-gray-200/50 dark:border-white/10 shadow-sm">
                                            GHS {e.income.toLocaleString()}
                                        </span>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-gray-500 py-8 italic font-medium">No revenue recorded yet.</p>}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;

