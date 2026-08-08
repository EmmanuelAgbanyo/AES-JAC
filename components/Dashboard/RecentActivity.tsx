import React from 'react';
import type { Entrepreneur, Transaction } from '../../types';
import { TransactionType } from '../../constants';
import { Activity, Users, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

type ActivityItem =
    | { date: string; type: 'transaction', data: Transaction }
    | { date: string; type: 'entrepreneur', data: Entrepreneur };

interface RecentActivityProps {
    activities: ActivityItem[];
    entrepreneurs: Entrepreneur[];
}

const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
};

const RecentActivity = ({ activities, entrepreneurs }: RecentActivityProps) => {
    const getEntrepreneurName = (id: string) => entrepreneurs.find(e => e.id === id)?.businessName || 'N/A';

    const renderActivityContent = (activity: ActivityItem) => {
        if (activity.type === 'transaction') {
            const t = activity.data;
            const isIncome = t.type === TransactionType.INCOME;
            return (
                <div className="flex justify-between items-center w-full group-hover:translate-x-1 transition-transform duration-300">
                    <div className="space-y-1">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight flex items-center gap-2">
                            {isIncome ? 'Payment Received' : 'Expense Recorded'}
                            {isIncome ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
                        </p>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {getEntrepreneurName(t.entrepreneurId)} • <span className="opacity-75">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </p>
                    </div>
                    <span className={`font-bold text-sm px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-sm ${isIncome ? 'text-emerald-700 bg-emerald-100/90 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/30' : 'text-rose-700 bg-rose-100/90 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700/30'}`}>
                        {isIncome ? '+' : '-'} GHS {t.amount.toFixed(2)}
                    </span>
                </div>
            );
        }
        if (activity.type === 'entrepreneur') {
            const e = activity.data;
            return (
                <div className="flex justify-between items-center w-full group-hover:translate-x-1 transition-transform duration-300">
                    <div className="space-y-1">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight">New Entrepreneur</p>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{e.name} <span className="opacity-75">({e.businessName})</span></p>
                    </div>
                    <span className="text-xs font-black tracking-wide uppercase text-purple-700 bg-purple-100/90 border border-purple-200/50 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700/30 px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-md">
                        Joined
                    </span>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-2xl p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors duration-500 group">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-400/20 to-blue-500/20 rounded-xl ring-1 ring-indigo-400/30">
                            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Recent Activity
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-11">Latest platform updates</p>
                </div>
                <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 border border-indigo-100/50 dark:border-indigo-500/20">
                    View All
                </button>
            </div>

            {activities.length > 0 ? (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4">
                    {activities.map((activity, index) => (
                        <motion.div variants={itemVariants} key={index} className="flex items-center gap-5 p-4 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300 group cursor-default border border-gray-100/50 dark:border-white/5 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1">
                            <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300 ring-1 ring-inset ${activity.type === 'transaction'
                                    ? (activity.data.type === TransactionType.INCOME
                                        ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/20 dark:text-emerald-400 dark:ring-emerald-700/50'
                                        : 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 ring-rose-200 dark:from-rose-900/40 dark:to-rose-800/20 dark:text-rose-400 dark:ring-rose-700/50')
                                    : 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 ring-purple-200 dark:from-purple-900/40 dark:to-purple-800/20 dark:text-purple-400 dark:ring-purple-700/50'
                                }`}>
                                {activity.type === 'transaction' ? <CreditCard className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                            </div>
                            {renderActivityContent(activity)}
                        </motion.div>
                    ))}
                </motion.div>
            ) : <p className="text-center text-gray-500 py-8 italic font-medium">No recent activity found.</p>}
        </div>
    );
};

export default React.memo(RecentActivity);
