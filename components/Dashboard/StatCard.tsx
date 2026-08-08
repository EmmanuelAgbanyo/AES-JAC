import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: number;
    previousValue: number;
    formatAs?: 'currency' | 'number';
    isExpense?: boolean;
    icon?: 'income' | 'expense' | 'net' | 'users' | 'wallet';
}

const StatCard = ({ title, value, previousValue, formatAs = 'number', isExpense = false, icon = 'wallet' }: StatCardProps) => {

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

    // Determine Icon & Colors based on prop or fallback to title
    let Icon = Wallet;
    let iconColor = 'text-indigo-600 dark:text-indigo-400';
    let iconBg = 'bg-indigo-600/10 dark:bg-indigo-500/20';
    let gradientHover = 'from-indigo-500/10';

    if (icon === 'income' || title.toLowerCase().includes('income') && !title.toLowerCase().includes('net')) {
        Icon = DollarSign;
        iconColor = 'text-emerald-600 dark:text-emerald-400';
        iconBg = 'bg-emerald-600/10 dark:bg-emerald-500/20';
        gradientHover = 'from-emerald-500/10';
    } else if (icon === 'expense' || title.toLowerCase().includes('expense')) {
        Icon = TrendingDown;
        iconColor = 'text-rose-600 dark:text-rose-400';
        iconBg = 'bg-rose-600/10 dark:bg-rose-500/20';
        gradientHover = 'from-rose-500/10';
    } else if (icon === 'users' || title.toLowerCase().includes('entrepreneur')) {
        Icon = Users;
        iconColor = 'text-purple-600 dark:text-purple-400';
        iconBg = 'bg-purple-600/10 dark:bg-purple-500/20';
        gradientHover = 'from-purple-500/10';
    } else if (icon === 'net' || title.toLowerCase().includes('net')) {
        Icon = TrendingUp;
        iconColor = 'text-blue-600 dark:text-blue-400';
        iconBg = 'bg-blue-600/10 dark:bg-blue-500/20';
        gradientHover = 'from-blue-500/10';
    }

    const getTrendIcon = () => {
        if (percentageChange === 0 || isNaN(percentageChange)) return null;
        return isPositive ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        );
    };

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="relative overflow-hidden bg-white/80 dark:bg-gray-900/50 backdrop-blur-2xl p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors duration-500 group"
        >
            {/* Subtle Gradient Background Overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${gradientHover} to-transparent pointer-events-none`}></div>

            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={`p-3.5 rounded-2xl shadow-sm ${iconBg} ${iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                    <Icon className="w-6 h-6" />
                </div>
                {!isNaN(percentageChange) && Math.abs(percentageChange) > 0 && Math.abs(percentageChange) !== Infinity && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide border shadow-sm backdrop-blur-md ${isExpense
                        ? (isNegative ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/30' : 'bg-rose-100/90 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700/30')
                        : (isPositive ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/30' : 'bg-rose-100/90 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700/30')
                        }`}>
                        {getTrendIcon()}
                        <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                    </div>
                )}
            </div>

            <div className="relative z-10 space-y-1">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {formatValue(value)}
                </h3>
                <div className="h-6 overflow-hidden">
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-300 text-xs font-bold">Previous</span>
                        {formatValue(previousValue)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(StatCard);
