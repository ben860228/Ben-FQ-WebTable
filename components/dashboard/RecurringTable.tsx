'use client';

import { useState } from 'react';
import { RecurringItem } from '@/lib/types';
import { ArrowUpDown, Calendar, RefreshCw, Calculator, Clock } from 'lucide-react';
import { getRate } from '@/lib/financial-logic';

interface RecurringTableProps {
    items: RecurringItem[];
    categoryMap?: Record<string, string>;
}

export default function RecurringTable({ items, categoryMap = {} }: RecurringTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof RecurringItem | 'Amount_Base' | 'Annual', direction: 'asc' | 'desc' } | null>(null);
    const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');

    // Helper: Friendly Frequency
    const getFrequencyLabel = (freqStr: string) => {
        const f = parseInt(freqStr);
        if (f === 12) return '每月 (Monthly)';
        if (f === 1) return '每年 (Yearly)';
        if (f === 4) return '每季 (Quarterly)';
        if (f === 2) return '每半年 (Semi-Annual)';
        if (f === 6) return '每雙月 (Bi-Monthly)';
        return `${f} times/yr`;
    };

    // Helper: Annual Amount
    const getAnnualAmount = (item: RecurringItem) => {
        const freq = parseInt(item.Frequency) || 0;
        return item.Amount_Base * freq;
    };

    // Helper: Next Date (Respects Start_Date)
    const getNextDate = (item: RecurringItem) => {
        const now = new Date();
        const start = item.Start_Date ? new Date(item.Start_Date) : new Date(0); // Epoch if invalid

        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // Target calculator
        let targetYear = year;
        let targetMonth = month;
        let targetDay = item.Payment_Day || 1;

        if (item.Specific_Month) {
            // Yearly Logic
            targetMonth = parseInt(item.Specific_Month.split(';')[0]);
            // If current date > target date this year, move to next year
            const thisYearDate = new Date(year, targetMonth - 1, targetDay);
            if (now > thisYearDate) {
                targetYear++;
            }
        } else {
            // Monthly Logic (Simplified for Freq=12)
            // If current day > payment day, move to next month
            if (day > targetDay) {
                targetMonth++;
                if (targetMonth > 12) {
                    targetMonth = 1;
                    targetYear++;
                }
            }
        }

        let calculatedDate = new Date(targetYear, targetMonth - 1, targetDay);

        // If calculated date is BEFORE Start_Date, align to Start_Date or first occurrence after
        if (calculatedDate < start) {
            // Just use Start Date as the first "next" occurrence if it's in the future
            return start.toISOString().split('T')[0].replace(/-/g, '/');
        }

        return `${targetYear}/${targetMonth}/${targetDay}`;
    };

    const augmentedItems = items.map(item => ({
        ...item,
        Annual: getAnnualAmount(item),
        NextDate: getNextDate(item),
        // Use Sheet Category_Name first, then dynamic Map, then Raw
        DisplayCategory: item.Category_Name || categoryMap[item.Category] || item.Category,
        DisplayFrequency: getFrequencyLabel(item.Frequency)
    }));

    const sortedItems = [...augmentedItems]
        .filter(item => filterType === 'All' || item.Type === filterType)
        .sort((a, b) => {
            if (!sortConfig) return 0;
            // @ts-ignore
            const aValue = a[sortConfig.key] || 0;
            // @ts-ignore
            const bValue = b[sortConfig.key] || 0;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const requestSort = (key: any) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 mt-6 relative border border-slate-800 bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">週期性項目 (Recurring Items)</h3>
                    <p className="text-2xl font-bold text-white mt-1">詳細收支表</p>
                </div>
                <div className="flex gap-2">
                    {['All', 'Income', 'Expense'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === type
                                ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                                }`}
                        >
                            {type === 'All' ? '全部' : type === 'Income' ? '收入' : '支出'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs text-slate-500 font-mono uppercase tracking-wider">
                            <th className="pb-2 font-medium pl-0 cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Name')}>
                                項目 (Name)
                            </th>
                            <th className="pb-2 font-medium text-center cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Factory')}>
                                頻率 (Freq)
                            </th>
                            <th className="pb-2 font-medium text-center cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Category')}>
                                類別 (Cat)
                            </th>
                            <th className="pb-2 font-medium text-center">
                                下次日期 (Next)
                            </th>
                            <th className="pb-2 font-medium text-right cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Amount_Base')}>
                                單次金額 (Amount)
                            </th>
                            {/* Moved Annual to end as requested */}
                            <th className="pb-2 font-medium text-right cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Annual')}>
                                年金額 (Annual)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedItems.map((item) => (
                            <tr key={item.ID} className="hover:bg-slate-900/50 transition-colors group">
                                <td className="py-2 px-4 pl-0 font-medium text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-6 rounded-full ${item.Type === 'Income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div>
                                            <div className="text-sm font-semibold">{item.Name}</div>
                                            {item.Note && <div className="text-[10px] text-slate-500 mt-0.5">{item.Note}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-center">
                                    <div className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 inline-block font-mono">
                                        {item.DisplayFrequency}
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-center">
                                    <span className="inline-block px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-medium border border-slate-700">
                                        {item.DisplayCategory}
                                    </span>
                                </td>
                                <td className="py-2 px-4 text-center text-xs font-mono text-slate-300">
                                    <div className="flex items-center justify-center gap-1.5 opacity-80">
                                        {item.NextDate}
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <span className={`font-mono font-bold text-sm ${item.Type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {item.Currency} ${item.Amount_Base.toLocaleString()}
                                    </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="font-mono text-xs text-slate-600">
                                        ${item.Annual.toLocaleString()}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
