import React from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface ChartData {
    name: string;
    Income: number;
    Expenses: number;
    'Net Income': number;
}

interface PerformanceChartProps {
    data: ChartData[];
}

const PerformanceChart = ({ data }: PerformanceChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[350px] text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <p className="font-medium text-sm">No data available for the selected period.</p>
            </div>
        );
    }

    const formatCurrency = (value: number) => `GHS ${value.toLocaleString()}`;

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} stroke="#9ca3af" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tickFormatter={(value) => `GHS ${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                            padding: '16px'
                        }}
                        itemStyle={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}
                        labelStyle={{ color: '#6b7280', fontWeight: 700, marginBottom: '10px', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                        formatter={(value: number) => [formatCurrency(value)]}
                        cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                    />
                    <Bar dataKey="Income" fill="url(#colorIncome)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Expenses" fill="url(#colorExpense)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line
                        type="monotone"
                        dataKey="Net Income"
                        stroke="#4f46e5"
                        strokeWidth={4}
                        dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default React.memo(PerformanceChart);
