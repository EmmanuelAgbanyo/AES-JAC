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
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                <p>No data available for the selected period.</p>
            </div>
        );
    }

    const formatCurrency = (value: number) => `GHS ${value.toLocaleString()}`;

    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} stroke="#6B7280" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    tickFormatter={(value) => `GHS ${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '16px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#1f2937' }}
                    labelStyle={{ color: '#6b7280', fontWeight: 600, marginBottom: '10px', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    formatter={(value: number) => [formatCurrency(value)]}
                    cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 4 }}
                />
                <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                />
                <Bar dataKey="Income" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expenses" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line
                    type="monotone"
                    dataKey="Net Income"
                    stroke="#0A369D"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default React.memo(PerformanceChart);
