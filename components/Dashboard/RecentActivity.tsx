import React from 'react';
import type { Entrepreneur, Transaction } from '../../types';
import { TransactionType } from '../../constants';
// Import icons (assuming we want to genericize if ActivityIcon is used internally or can be replaced)
// using unicode for now or could import from Icons if we assume those fit 'transaction'/'entrepreneur' mapping
// Let's stick to the cleaner layout requested
import { ActivityIcon, UsersIcon, CreditCardIcon } from '../Icons';

type Activity =
    | { date: string; type: 'transaction', data: Transaction }
    | { date: string; type: 'entrepreneur', data: Entrepreneur };

interface RecentActivityProps {
    activities: Activity[];
    entrepreneurs: Entrepreneur[];
}

const RecentActivity = ({ activities, entrepreneurs }: RecentActivityProps) => {
    const getEntrepreneurName = (id: string) => entrepreneurs.find(e => e.id === id)?.businessName || 'N/A';

    const renderActivityContent = (activity: Activity) => {
        if (activity.type === 'transaction') {
            const t = activity.data;
            const isIncome = t.type === TransactionType.INCOME;
            return (
                <div className="flex justify-between items-center w-full group-hover:translate-x-1 transition-transform duration-200">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            {isIncome ? 'Payment Received' : 'Expense Recorded'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {getEntrepreneurName(t.entrepreneurId)} • <span className="text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <span className={`font-bold text-sm ${isIncome ? 'text-green-600 bg-green-50 px-2 py-1 rounded-md' : 'text-red-600 bg-red-50 px-2 py-1 rounded-md'}`}>
                        {isIncome ? '+' : '-'} GHS {t.amount.toFixed(2)}
                    </span>
                </div>
            );
        }
        if (activity.type === 'entrepreneur') {
            const e = activity.data;
            return (
                <div className="flex justify-between items-center w-full group-hover:translate-x-1 transition-transform duration-200">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">New Entrepreneur</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.name} ({e.businessName})</p>
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                        Joined
                    </span>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="bg-white/60 dark:bg-black/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/5 hover:border-white/60 transition-colors duration-300">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-aesBlue/10 rounded-lg">
                        <ActivityIcon className="w-5 h-5 text-aesBlue" />
                    </div>
                    Recent Activity
                </h3>
                <button className="text-xs font-bold text-aesBlue hover:text-blue-700 transition-colors bg-blue-50 dark:bg-white/5 px-3 py-1.5 rounded-lg hover:bg-blue-100">View All</button>
            </div>

            {activities.length > 0 ? (
                <div className="space-y-3">
                    {activities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 group cursor-default border border-white/20 dark:border-white/5 hover:shadow-lg hover:-translate-y-1 hover:border-white/50">
                            <div className={`p-3 rounded-xl shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300 ${activity.type === 'transaction'
                                    ? (activity.data.type === TransactionType.INCOME
                                        ? 'bg-gradient-to-br from-green-100 to-green-50 text-green-600'
                                        : 'bg-gradient-to-br from-red-100 to-red-50 text-red-600')
                                    : 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600'
                                }`}>
                                {activity.type === 'transaction' ? <CreditCardIcon className="w-5 h-5" /> : <UsersIcon className="w-5 h-5" />}
                            </div>
                            {renderActivityContent(activity)}
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-gray-500 py-8 italic">No recent activity found.</p>}
        </div>
    );
};

export default React.memo(RecentActivity);
