'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RecurringItem } from '@/lib/types';
import { useMemo } from 'react';
import { CATEGORY_MAPPING } from '@/lib/mockData';

interface ExpenseBreakdownProps {
    items: RecurringItem[];
    categoryMap?: Record<string, string>;
}

export default function ExpenseBreakdown({ items, categoryMap = {} }: ExpenseBreakdownProps) {
    const data = useMemo(() => {
        const expenses = items.filter(i => i.Type === 'Expense');
        const breakdown: Record<string, number> = {};

        expenses.forEach(item => {
            // Primitive calc assuming monthly
            // In real app, reuse the precise logic from mockData
            const amount = item.Amount_Base;
            const catName = categoryMap[item.Category] || item.Category;
            breakdown[catName] = (breakdown[catName] || 0) + amount;
        });

        return Object.entries(breakdown)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [items]);

    const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E'];

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400">支出結構 (Breakdown)</h3>
                <p className="text-2xl font-bold text-white mt-1">消費分析</p>
            </div>

            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: 'none' }}
                            itemStyle={{ color: '#f8fafc' }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconType="circle"
                            formatter={(value) => <span className="text-slate-400 text-xs ml-2">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text Overlay */}
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pr-28">
                    <span className="text-xs text-slate-500 block">Total</span>
                    <span className="text-rose-500 font-bold text-lg">EXP</span>
                </div>
            </div>
        </div>
    );
}
