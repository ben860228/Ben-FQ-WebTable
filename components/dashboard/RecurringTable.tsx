'use client';

import { useState } from 'react';
import { RecurringItem, OneOffEvent } from '@/lib/types'; // Import OneOffEvent interface
import { ArrowUpDown, Calendar, RefreshCw, Calculator, Clock, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { getRate } from '@/lib/financial-logic';



interface RecurringTableProps {
    items: RecurringItem[];
    oneOffEvents?: OneOffEvent[]; // Optional prop for one-off events
    categoryMap?: Record<string, string>;
}

export default function RecurringTable({ items, oneOffEvents = [], categoryMap = {} }: RecurringTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof RecurringItem | 'Amount_Base' | 'Annual' | 'Type', direction: 'asc' | 'desc' } | null>({ key: 'Type', direction: 'asc' });
    const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense' | 'Savings' | 'Debt'>('All');
    const [showOneOffs, setShowOneOffs] = useState(true);

    // Type Color Map (Based on CSV Content: Income, Expense, Debt, Savings)
    const getTypeColor = (type: string) => {
        const t = (type || '').trim();
        if (t === 'Income') return 'bg-emerald-500';
        if (t === 'Expense') return 'bg-rose-500';
        if (t === 'Savings') return 'bg-amber-500'; // Orange as requested
        if (t === 'Debt') return 'bg-indigo-500'; // Blue-ish for Debt to differentiate
        return 'bg-slate-500';
    };

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
        DisplayFrequency: getFrequencyLabel(item.Frequency),
        IsOneOff: false
    }));

    // Detect Current Year for One-Off Filtering
    const currentYear = new Date().getFullYear(); // 2026

    // Process One-Off Events
    const augmentedOneOffs = oneOffEvents
        .filter(event => {
            const eventYear = new Date(event.Date).getFullYear();
            return eventYear === currentYear;
        })
        .map(event => ({
            ID: `OneOff-${event.ID}`, // Prefix to avoid collision
            Name: event.Name,
            Type: event.Type, // Income/Expense
            Frequency: "1", // One-off is freq 1
            Amount_Base: event.Amount,
            Currency: "TWD", // Default to TWD for now unless event has currency
            Annual: event.Amount, // One-off annual is just amount
            NextDate: event.Date, // Use actual date
            DisplayCategory: event.Category || 'One-Off',
            DisplayFrequency: '一次性 (2026)',
            Note: event.Note || 'One-Off Event',
            IsOneOff: true,
            Category: event.Category || 'One-Off' // Fallback for sort
        }));

    // Merge and Display logic:
    // User wants "Detailed Income/Expense Table" to show One-Offs too.
    // We add them to the main list for the table rows IF showOneOffs is true.
    const allItems = [...augmentedItems, ...(showOneOffs ? augmentedOneOffs : [])] as (typeof augmentedItems[0] & { IsOneOff: boolean })[];

    const sortedItems = [...allItems]
        .filter(item => filterType === 'All' || (item.Type as string) === filterType)
        .sort((a, b) => {
            // Default: Group by Type first
            if (!sortConfig || sortConfig.key === 'Type') {
                const typeA = a.Type || '';
                const typeB = b.Type || '';

                // Custom Order: Income -> Savings -> Debt -> Expense
                const typeOrder = ['Income', 'Savings', 'Debt', 'Expense'];
                const idxA = typeOrder.indexOf(typeA);
                const idxB = typeOrder.indexOf(typeB);

                // If both are known types, sort by index
                if (idxA !== -1 && idxB !== -1) {
                    if (idxA !== idxB) return idxA - idxB;
                } else {
                    // Fallback for unknown types (put at end)
                    if (typeA !== typeB) return typeA.localeCompare(typeB);
                }

                // If same type, sort by ID
                const idA = Number(a.ID.replace(/\D/g, '')) || 9999;
                const idB = Number(b.ID.replace(/\D/g, '')) || 9999;
                return idA - idB;
            }

            // Special handling for Frequency (Number)
            if (sortConfig.key === 'Frequency') {
                const freqA = parseInt(a.Frequency) || 0;
                const freqB = parseInt(b.Frequency) || 0;
                return sortConfig.direction === 'asc' ? freqA - freqB : freqB - freqA;
            }

            // Other Sorts
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
            <div className="mb-6 flex items-end justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">週期性項目 (Recurring Items)</h3>
                    <div className="flex items-end gap-4 mt-1">
                        <p className="text-2xl font-bold text-white">詳細收支表 ({currentYear})</p>
                        <div className="text-xs font-mono text-slate-500 flex gap-3 flex-col">
                            {/* Row 1: Recurring Base (Original) */}
                            <div className="flex gap-3 items-center">
                                <span className="text-[10px] text-slate-600 uppercase tracking-widest px-1 border border-slate-700 rounded">Base</span>
                                {filterType === 'All' ? (
                                    <>
                                        <span className="text-emerald-400">In: ${Math.round(augmentedItems.filter(i => (i.Type as string) === 'Income').reduce((s, i) => s + i.Annual, 0)).toLocaleString()}</span>
                                        <span className="text-amber-400">Sav: ${Math.round(augmentedItems.filter(i => (i.Type as string) === 'Savings').reduce((s, i) => s + i.Annual, 0)).toLocaleString()}</span>
                                        <span className="text-indigo-400">Debt: ${Math.round(augmentedItems.filter(i => (i.Type as string) === 'Debt').reduce((s, i) => s + i.Annual, 0)).toLocaleString()}</span>
                                        <span className="text-rose-400">Exp: ${Math.round(augmentedItems.filter(i => (i.Type as string) === 'Expense').reduce((s, i) => s + i.Annual, 0)).toLocaleString()}</span>

                                        {/* Net Flow Calculation (Recurring Only) */}
                                        {(() => {
                                            const inc = augmentedItems.filter(i => (i.Type as string) === 'Income').reduce((s, i) => s + i.Annual, 0);
                                            const out = augmentedItems.filter(i => ['Expense', 'Debt', 'Savings'].includes(i.Type as string)).reduce((s, i) => s + i.Annual, 0);
                                            const net = inc - out;
                                            return (
                                                <span className={`pl-2 border-l border-slate-700 font-bold ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    Net: ${Math.round(net).toLocaleString()}
                                                </span>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <span className="text-white">
                                        Base Total: ${Math.round(augmentedItems.filter(item => (item.Type as string) === filterType).reduce((s, i) => s + i.Annual, 0)).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {/* Row 2: 2026 Actual/Forecast (With One-Offs) */}
                            {showOneOffs &&
                                <div className="flex gap-3 items-center border-t border-slate-800/50 pt-1 mt-0.5">
                                    <span className="text-[10px] text-cyan-800 uppercase tracking-widest px-1 border border-cyan-900 rounded bg-cyan-950/30 text-cyan-400">2026</span>
                                    {filterType === 'All' ? (
                                        <>
                                            {/* We only calculate "Net" difference mostly, but user might want to see Total In/Exp changed.
                                            Let's show "Adj Net" which is the most critical info.
                                            Or show full breakdown if space permits. Space is tight.
                                            User requested: "Net: $-xxx" ... "One more calculation with One_Off_Events".
                                            Let's show the Adjusted Net prominently.
                                         */}

                                            {(() => {
                                                // 1. Recurring Net
                                                const recInc = augmentedItems.filter(i => (i.Type as string) === 'Income').reduce((s, i) => s + i.Annual, 0);
                                                const recOut = augmentedItems.filter(i => ['Expense', 'Debt', 'Savings'].includes(i.Type as string)).reduce((s, i) => s + i.Annual, 0);
                                                const recNet = recInc - recOut;

                                                // 2. One-Off Net
                                                const oneOffIncome = augmentedOneOffs.filter(i => i.Type === 'Income').reduce((s, i) => s + i.Amount_Base, 0);
                                                const oneOffExpense = augmentedOneOffs.filter(i => ['Expense', 'Debt', 'Savings'].includes(i.Type as string)).reduce((s, i) => s + i.Amount_Base, 0); // Assuming OneOff mapped to Expense mostly
                                                // Note: OneOff structure in augmentedOneOffs just used 'Amount_Base' for 'Annual'.

                                                const finalNet = (recNet + oneOffIncome) - oneOffExpense;

                                                return (
                                                    <>
                                                        <span className="text-slate-400 text-[10px]">
                                                            (One-Off: <span className="text-emerald-400">+{oneOffIncome.toLocaleString()}</span> / <span className="text-rose-400">-{oneOffExpense.toLocaleString()}</span>)
                                                        </span>
                                                        <span className={`pl-2 border-l border-slate-700 font-bold ${finalNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            Est. Net: ${Math.round(finalNet).toLocaleString()}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <span className="text-zinc-500 text-xs italic">
                                            (Select 'All' to see 2026 Forecast)
                                        </span>
                                    )}
                                </div>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-start">

                    {['All', 'Income', 'Expense', 'Savings', 'Debt'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === type
                                ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                                }`}
                        >
                            {type === 'All' ? '全部' : type === 'Income' ? '收入' : type === 'Expense' ? '支出' : type === 'Savings' ? '儲蓄' : '債務'}
                        </button>
                    ))}
                    {/* Reset Sort Button */}
                    <button
                        onClick={() => setSortConfig({ key: 'Type', direction: 'asc' })}
                        className="ml-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center"
                        title="Reset Sort"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Show/Hide One-Offs Button */}
                    <button
                        onClick={() => setShowOneOffs(!showOneOffs)}
                        className={`ml-2 p-1.5 rounded-xl border transition-all flex items-center justify-center ${showOneOffs
                            ? 'bg-purple-900/30 text-purple-300 border-purple-800 hover:bg-purple-900/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                            }`}
                        title={showOneOffs ? "隱藏一次性事件" : "顯示一次性事件"}
                    >
                        {showOneOffs ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs text-slate-500 font-mono uppercase tracking-wider">
                            <th className="pb-2 font-medium pl-0 cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Name')}>
                                項目 (Name)
                            </th>
                            <th className="pb-2 font-medium text-center cursor-pointer hover:text-indigo-400" onClick={() => requestSort('Frequency')}>
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
                                        <div className={`w-1 h-6 rounded-full ${getTypeColor(item.Type)}`} />
                                        <div>
                                            <div className="text-sm font-semibold">{item.Name}</div>
                                            {item.Note && <div className="text-[10px] text-slate-500 mt-0.5">{item.Note}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-center">
                                    <div className={`text-[10px] px-2 py-0.5 rounded border inline-block font-mono ${item.IsOneOff
                                        ? 'bg-purple-900/30 text-purple-300 border-purple-800'
                                        : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                                        {item.DisplayFrequency}
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-800 text-slate-300 border-slate-700`}>
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
