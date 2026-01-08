'use client';

import {
    ComposedChart,
    Bar,
    Line,
    CartesianGrid,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    YAxis,
    Legend,
    ReferenceLine
} from 'recharts';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CashFlowChartProps {
    data: {
        monthLabel: string;
        income: number;
        expense: number;
        savings: number;
        net: number;
        projectedNW: number;
        details?: {
            income: { name: string; amount: number; id: number; isConverted?: boolean }[];
            expense: { name: string; amount: number; id: number; isConverted?: boolean }[];
            savings: { name: string; amount: number; id: number; isConverted?: boolean }[];
        };
    }[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
    const [selectedMonth, setSelectedMonth] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const monthData = payload[0].payload;
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-xl backdrop-blur-md min-w-[200px] z-50">
                    <p className="text-slate-200 font-bold mb-2 border-b border-slate-800 pb-2">{label}</p>
                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-emerald-400">總收入</span>
                            <span className="text-white font-mono">${monthData.income.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-rose-400">總支出</span>
                            <span className="text-white font-mono">${monthData.expense.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-amber-400">儲蓄</span>
                            <span className="text-white font-mono">${monthData.savings.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-slate-700 mt-1">
                            <span className="text-blue-400">預估淨值</span>
                            <span className="text-white font-bold font-mono">${(monthData.projectedNW / 1000).toFixed(0)}k</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center italic">由點擊查看詳細明細 (Click for details)</p>
                </div>
            );
        }
        return null;
    };

    // Robust handler for Chart clicks
    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length) {
            setSelectedMonth(data.activePayload[0].payload);
        } else if (data && data.payload && data.payload.details) {
            // Fallback for direct bar clicks if payload structure differs
            setSelectedMonth(data.payload);
        }
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col relative">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">現金流趨勢 (Cash Flow)</h3>
                    <p className="text-2xl font-bold text-white mt-1">每月收支</p>
                </div>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">收入</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-600" />
                        <span className="text-slate-400">支出</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-400">儲蓄</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-blue-500" />
                        <span className="text-slate-400">預估淨值</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                {mounted ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                        <ComposedChart
                            data={data}
                            barGap={4}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            onClick={handleChartClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <defs>
                                <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
                            <XAxis
                                dataKey="monthLabel"
                                stroke="#475569"
                                fontSize={12}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={50}
                                tickFormatter={(val) => {
                                    const [month, year] = val.split(' ');
                                    return `${month}\n${year}`;
                                }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#475569"
                                fontSize={12}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#3B82F6"
                                fontSize={12}
                                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                                axisLine={false}
                                tickLine={false}
                                domain={['auto', 'auto']}
                            />
                            <ReferenceLine y={0} yAxisId="right" stroke="#475569" strokeDasharray="3 3" opacity={0.5} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar yAxisId="left" dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} onClick={handleChartClick} style={{ cursor: 'pointer' }} />
                            <Bar yAxisId="left" dataKey="expense" name="支出" fill="#be123c" radius={[4, 4, 0, 0]} maxBarSize={30} onClick={handleChartClick} style={{ cursor: 'pointer' }} />
                            <Bar yAxisId="left" dataKey="savings" name="儲蓄" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} onClick={handleChartClick} style={{ cursor: 'pointer' }} />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="projectedNW"
                                name="預估淨值"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-pulse bg-slate-800/50 w-full h-full rounded-xl" />
                    </div>
                )}
            </div>

            {/* Detail Modal - Rendered via Portal */}
            {mounted && selectedMonth && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedMonth(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedMonth.monthLabel} 明細總覽</h3>
                                <div className="flex gap-4 text-xs mt-1 font-mono text-slate-400">
                                    <span>收: ${selectedMonth.income.toLocaleString()}</span>
                                    <span>支: ${selectedMonth.expense.toLocaleString()}</span>
                                    <span>存: ${selectedMonth.savings.toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMonth(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-y-auto p-5 space-y-6">
                            {(['income', 'expense', 'savings'] as const).map(type => {
                                const items = selectedMonth.details?.[type] || [];
                                if (items.length === 0) return null;
                                const title = type === 'income' ? '收入 (Income)'
                                    : type === 'expense' ? '支出 (Expense)'
                                        : '儲蓄 (Savings)';
                                const colorClass = type === 'income' ? 'text-emerald-400 border-emerald-500/30'
                                    : type === 'expense' ? 'text-rose-400 border-rose-500/30'
                                        : 'text-amber-400 border-amber-500/30';

                                const sortedItems = [...items].sort((a, b) => b.amount - a.amount);

                                return (
                                    <div key={type}>
                                        <h4 className={`text-sm font-bold mb-2 pb-1 border-b ${colorClass} uppercase tracking-wider`}>{title}</h4>
                                        <div className="space-y-1">
                                            {sortedItems.map((item: any, idx: number) => {
                                                const isEvent = item.name.includes('(Event)');
                                                return (
                                                    <div key={idx} className={`flex justify-between text-sm py-1 px-2 rounded hover:bg-white/5 transition-colors ${isEvent ? 'bg-indigo-500/10' : ''}`}>
                                                        <span className={`text-slate-300 truncate max-w-[240px] ${isEvent ? 'text-indigo-300 font-medium' : ''}`}>
                                                            {item.name}
                                                        </span>
                                                        <span className="text-slate-400 font-mono">
                                                            {item.isConverted && <span className="text-xs text-slate-600 mr-1">*</span>}
                                                            ${Math.round(item.amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
