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

interface CashFlowChartProps {
    data: {
        monthLabel: string;
        income: number;
        expense: number;
        savings: number;
        net: number;
        details?: {
            income: { name: string; amount: number; id: number }[];
            expense: { name: string; amount: number; id: number }[];
            savings: { name: string; amount: number; id: number }[];
        };
    }[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const monthData = payload[0].payload;
            const details = monthData.details || { income: [], expense: [], savings: [] };

            // Sort items by ID ascending (mimic sheet order)
            const topIncome = [...details.income].sort((a, b) => (a.id || 0) - (b.id || 0));
            const topExpense = [...details.expense].sort((a, b) => (a.id || 0) - (b.id || 0));
            const topSavings = [...(details.savings || [])].sort((a, b) => (a.id || 0) - (b.id || 0));

            return (
                <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-xl backdrop-blur-md min-w-[240px] z-50">
                    <p className="text-slate-200 font-bold mb-3 border-b border-slate-800 pb-2 sticky top-0 bg-slate-900/95">{label}</p>

                    {/* Summary: Income */}
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400">Total Income</span>
                        <span className="text-white">${monthData.income.toLocaleString()}</span>
                    </div>
                    <div className="mb-4 pl-2 border-l-2 border-emerald-500/20 space-y-1">
                        {topIncome.map((i: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-400 hover:text-white hover:bg-white/5 px-1 rounded transition-colors">
                                <span className="truncate max-w-[140px]">{i.name}</span>
                                <span className="font-mono">${Math.round(i.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary: Expense */}
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-rose-400">Total Expense</span>
                        <span className="text-white">${monthData.expense.toLocaleString()}</span>
                    </div>
                    <div className="mb-3 pl-2 border-l-2 border-rose-500/20 space-y-1">
                        {topExpense.map((i: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-400 hover:text-white hover:bg-white/5 px-1 rounded transition-colors">
                                <span className="truncate max-w-[140px]">{i.name}</span>
                                <span className="font-mono">${Math.round(i.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary: Savings */}
                    {topSavings.length > 0 && (
                        <>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-amber-400">Savings</span>
                                <span className="text-white">${monthData.savings.toLocaleString()}</span>
                            </div>
                            <div className="mb-3 pl-2 border-l-2 border-amber-500/20 space-y-1">
                                {topSavings.map((i: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-slate-400 hover:text-white hover:bg-white/5 px-1 rounded transition-colors">
                                        <span className="truncate max-w-[140px]">{i.name}</span>
                                        <span className="font-mono">${Math.round(i.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
                        <span className="text-xs text-slate-400">Projected NW</span>
                        <span className="text-sm font-bold font-mono text-amber-400">
                            ${(monthData.projectedNW / 1000).toFixed(0)}k
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col">
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
                        <div className="w-3 h-0.5 bg-amber-400" />
                        <span className="text-slate-400">預估淨值</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                                // val is like "Jan 2026"
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
                            stroke="#F59E0B"
                            fontSize={12}
                            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            axisLine={false}
                            tickLine={false}
                            domain={['auto', 'auto']}
                        />
                        <ReferenceLine y={0} yAxisId="right" stroke="#475569" strokeDasharray="3 3" opacity={0.5} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar yAxisId="left" dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar yAxisId="left" dataKey="expense" name="支出" fill="#be123c" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar yAxisId="left" dataKey="savings" name="儲蓄" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="projectedNW"
                            name="預估淨值"
                            stroke="#F59E0B"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
