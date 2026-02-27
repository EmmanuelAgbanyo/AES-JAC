
import React, { useState, useEffect } from 'react';
import type { Entrepreneur, Transaction, DashboardInsight } from '../types';
import { generateDashboardInsights } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface AiInsightsProps {
    entrepreneurs: Entrepreneur[];
    transactions: Transaction[];
}

const InsightCard: React.FC<{ insight: DashboardInsight }> = ({ insight }) => {
    const sentimentColor = {
        milestone: 'border-green-500 bg-green-50',
        warning: 'border-red-500 bg-red-50',
        opportunity: 'border-blue-500 bg-blue-50',
        trend: 'border-yellow-500 bg-yellow-50',
    };

    return (
        <div className={`p-4 rounded-lg border-l-4 flex items-start space-x-4 ${sentimentColor[insight.type]}`}>
            <div className="text-3xl">{insight.icon}</div>
            <div>
                <h4 className="font-bold text-gray-800">{insight.title}</h4>
                <p className="text-sm text-gray-600">{insight.description}</p>
            </div>
        </div>
    );
};

const AiInsights = ({ entrepreneurs, transactions }: AiInsightsProps) => {
    const [insights, setInsights] = useState<DashboardInsight[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only run if there's data to analyze
        if (entrepreneurs.length > 0 && transactions.length > 0 && process.env.API_KEY) {
            const fetchInsights = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const generatedInsights = await generateDashboardInsights(entrepreneurs, transactions);
                    setInsights(generatedInsights);
                } catch (err) {
                    console.error(err);
                    setError("Could not fetch AI insights.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchInsights();
        } else {
            setIsLoading(false);
        }
    }, [entrepreneurs, transactions]);
    
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center space-x-4">
                 <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">AI Analyst is checking your data...</p>
            </div>
        );
    }
    
    // Don't show the component if there's no API key or no insights found
    if (!process.env.API_KEY || (insights.length === 0 && !error)) {
        return null; 
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">AI Analyst Insights</h2>
            {error && <p className="text-red-500">{error}</p>}
            {insights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, index) => (
                        <InsightCard key={index} insight={insight} />
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic">No significant insights to report at the moment. Keep up the good work!</p>
            )}
        </div>
    );
};

export default AiInsights;
