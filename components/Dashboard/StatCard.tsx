import React from 'react';
import { WalletIcon, TrendingUpIcon, UsersIcon, BanknotesIcon } from '../Icons';

interface StatCardProps {
    title: string;
    value: number;
    previousValue: number;
    formatAs?: 'currency' | 'number';
    isExpense?: boolean;
}

const StatCard = ({ title, value, previousValue, formatAs = 'number', isExpense = false }: StatCardProps) => {

    const formatValue = (num: number) => {
        if (formatAs === 'currency') {
            return `GHS ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return num.toLocaleString();
    };

    let percentageChange = 0;
    if (previousValue !== 0) {
        percentageChange = ((value - previousValue) / Math.abs(previousValue)) * 100;
    } else if (value > 0) {
        percentageChange = 100;
    }

    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;

    // Determine colors
    let trendColor = 'text-gray-400';
    let trendBg = 'bg-gray-100 dark:bg-white/5';

    if (isExpense) {
        if (isNegative) { trendColor = 'text-green-500'; trendBg = 'bg-green-500/10'; }
        if (isPositive) { trendColor = 'text-red-500'; trendBg = 'bg-red-500/10'; }
    } else {
        if (isPositive) { trendColor = 'text-green-500'; trendBg = 'bg-green-500/10'; }
        if (isNegative) { trendColor = 'text-red-500'; trendBg = 'bg-red-500/10'; }
    }

    // Determine Icon
    let Icon = WalletIcon;
    let iconColor = 'text-aesBlue';
    let iconBg = 'bg-aesBlue/10';

    if (title.toLowerCase().includes('income') && !title.toLowerCase().includes('net')) {
        Icon = BanknotesIcon;
        iconColor = 'text-green-600';
        iconBg = 'bg-green-600/10';
    } else if (title.toLowerCase().includes('expense')) {
        Icon = TrendingUpIcon; // Or a specific expense icon
        iconColor = 'text-red-600';
        iconBg = 'bg-red-600/10';
    } else if (title.toLowerCase().includes('entrepreneur')) {
        Icon = UsersIcon;
        iconColor = 'text-purple-600';
        iconBg = 'bg-purple-600/10';
    }

    const getTrendIcon = () => {
        if (percentageChange === 0 || isNaN(percentageChange)) return null;
        return isPositive ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        );
    };

    return (
        <div className="relative overflow-hidden bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-6 rounded-3xl shadow-lg border border-white/50 dark:border-white/10 hover:border-white/80 dark:hover:border-white/20 transition-all duration-500 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-aesBlue/20">
            {/* Subtle Gradient Background Overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${isExpense ? 'from-red-500/10 to-transparent' : 'from-aesBlue/10 to-transparent'} pointer-events-none`}></div>

            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className={`p-3.5 rounded-2xl shadow-sm ${iconBg} ${iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                    <Icon className="w-7 h-7" />
                </div>
                {!isNaN(percentageChange) && Math.abs(percentageChange) > 0 && Math.abs(percentageChange) !== Infinity && (
                    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-sm ${isExpense
                        ? (isNegative ? 'bg-green-100/80 text-green-700 border-green-200/50' : 'bg-red-100/80 text-red-700 border-red-200/50')
                        : (isPositive ? 'bg-green-100/80 text-green-700 border-green-200/50' : 'bg-red-100/80 text-red-700 border-red-200/50')
                        }`}>
                        {getTrendIcon()}
                        <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {formatValue(value)}
                </h3>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                    <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-300">Previous:</span>
                    {formatValue(previousValue)}
                </p>
            </div>
        </div>
    );
};

export default React.memo(StatCard);
