'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';
import { RecurringItem } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';

interface ExpenseBreakdownProps {
    items: RecurringItem[];
    categoryMap?: Record<string, string>;
}

export default function ExpenseBreakdown({ items, categoryMap = {} }: ExpenseBreakdownProps) {
    const data = useMemo(() => {
        // Filter out items not active in the current year (or generally active)
        // Simplification: If Start_Date is in the future (> today + 1 month?), exclude.
        // Or strictly: If Start_Date > Today, exclude? 
        // User said "Start_Date 以前的事件不可以放進來" -> If Today < Start_Date, exclude.
        const today = new Date();

        const activeItems = items.filter(i => {
            if (i.Start_Date && new Date(i.Start_Date) > today) return false;
            // If End_Date exists and is in the past, exclude? Usually yes for "Current Breakdown".
            if (i.End_Date && new Date(i.End_Date) < today) return false;
            return true;
        });

        // Include Expense AND Savings/Invest items
        const expenses = activeItems.filter(i => {
            const cat = i.Category || '';
            const isSaving = cat === 'Savings' || cat === 'Invest' || cat === 'Startups' || i.Name.includes('儲蓄') || i.Name.includes('存錢');
            // Explicitly include R09/R10 even if they are marked as something else, because we want to categorize them as Savings below
            const isSpecial = i.ID === 'R09' || i.ID === 'R10';
            return i.Type === 'Expense' || isSaving || isSpecial;
        });

        const breakdown: Record<string, number> = {};
        const details: Record<string, { name: string; amount: number }[]> = {};

        expenses.forEach(item => {
            let annualAmount = item.Amount_Base;
            const freqStr = String(item.Frequency || '').trim().toLowerCase();
            let multiplier = 1;

            if (freqStr.includes(';')) {
                // Custom specific months, e.g. "1;4;7;10" -> 4 times a year
                multiplier = freqStr.split(';').filter(s => s.trim().length > 0).length;
            }
            else if (freqStr === '12' || freqStr.includes('month')) multiplier = 12;
            else if (freqStr === '4' || freqStr.includes('quarter')) multiplier = 4;
            else if (freqStr === '52' || freqStr.includes('week')) multiplier = 52;
            else if (freqStr === '1' || freqStr.includes('year')) multiplier = 1;
            else {
                const parsed = parseInt(freqStr);
                if (!isNaN(parsed)) multiplier = parsed;
            }

            annualAmount = annualAmount * multiplier;

            // Determine Category
            // 1. Force R09/R10/Insurance-Savings to "長期投資/儲蓄"
            // 2. Map Category
            let catName = categoryMap[item.Category] || item.Category;

            const isSpecialInsurance = item.ID === 'R09' || item.ID === 'R10';
            const isSavingsLike = catName === 'Savings' || catName === 'Invest' || catName === 'Startups' || item.Name.includes('儲蓄') || item.Name.includes('存錢');

            if (isSpecialInsurance || isSavingsLike) {
                catName = '長期投資/儲蓄';
            }

            breakdown[catName] = (breakdown[catName] || 0) + annualAmount;

            if (!details[catName]) details[catName] = [];
            // Push annualized amount
            details[catName].push({ name: item.Name, amount: annualAmount });
        });

        return Object.entries(breakdown)
            .map(([name, value]) => ({
                name,
                value,
                isGood: name === '長期投資/儲蓄' || name === 'Savings' || name === 'Invest',
                details: (details[name] || []).sort((a, b) => b.amount - a.amount)
            }))
            .sort((a, b) => b.value - a.value);
    }, [items, categoryMap]);

    const COLORS = ['#F43F5E', '#EC4899', '#D946EF', '#A855F7', '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#10B981', '#14B8A6'];

    // Calculate Totals
    const totalExpense = data.filter(d => d.name !== '長期投資/儲蓄').reduce((sum, item) => sum + item.value, 0);
    const totalSavings = data.find(d => d.name === '長期投資/儲蓄')?.value || 0;
    const grandTotal = totalExpense + totalSavings;

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950 relative">
            <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400">支出結構 (Breakdown)</h3>
                <p className="text-2xl font-bold text-white mt-1">消費分析</p>
            </div>

            <div className="flex-1 min-h-[300px] flex items-center gap-4">

                {/* Left: Pie Chart Section */}
                <div className="flex-1 h-full relative flex items-center justify-center">
                    {/* Absolute Center Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 pb-2">
                        <div className="text-xs font-bold text-slate-400 mb-1">支出: ${(totalExpense / 1000).toFixed(0)}k</div>
                        <div className="text-xs font-bold text-amber-500">儲蓄: ${(totalSavings / 1000).toFixed(0)}k</div>
                    </div>

                    {mounted ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => {
                                        let color = COLORS[index % COLORS.length];
                                        if (entry.name === '長期投資/儲蓄' || entry.name === 'Savings' || entry.name === 'Invest') {
                                            color = '#F59E0B'; // Gold/Amber
                                        }
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Pie>
                                <Tooltip
                                    wrapperStyle={{ zIndex: 1000 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload as any;
                                            return (
                                                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                                                    <p className="text-white font-medium mb-1 border-b border-slate-700 pb-1">{data.name}</p>
                                                    <p className="text-slate-300 text-sm font-bold">
                                                        ${Number(data.value).toLocaleString()}
                                                    </p>
                                                    <p className="text-slate-500 text-xs mb-2">
                                                        {((Number(data.value) / grandTotal) * 100).toFixed(1)}% of Total
                                                    </p>

                                                    {/* Full Details List */}
                                                    <div className="space-y-1">
                                                        {data.details.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800/50 last:border-0 py-0.5">
                                                                <span className="truncate pr-2">{item.name}</span>
                                                                <span className="font-mono text-slate-300">${Number(item.amount).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-40 h-40 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Right: Custom Legend Details */}
                <div className="w-[140px] flex flex-col justify-center space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.map((entry, index) => {
                        let color = COLORS[index % COLORS.length];
                        if (entry.name === '長期投資/儲蓄' || entry.name === 'Savings' || entry.name === 'Invest') {
                            color = '#F59E0B';
                        }
                        return (
                            <div key={`legend-${index}`} className="flex items-center text-xs text-slate-400">
                                <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate" title={entry.name}>{entry.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
