'use client';

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CashFlowChartProps {
    data: {
        monthLabel: string;
        income: number;
        expense: number;
        net: number;
    }[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-none ring-0">
                    <p className="text-slate-300 font-medium mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-400">{entry.name}:</span>
                            <span className="text-white font-mono font-bold">
                                ${entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Net Flow</span>
                        <span className={`text-xs font-bold font-mono ${payload[0].payload.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {payload[0].payload.net >= 0 ? '+' : ''}{payload[0].payload.net.toLocaleString()}
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
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-slate-400">支出</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.1 }} />
                        <Bar dataKey="income" name="收入" fill="url(#incomeColor)" radius={[4, 4, 0, 0]} maxBarSize={30} stroke="#10b981" strokeWidth={1} />
                        <Bar dataKey="expense" name="支出" fill="url(#expenseColor)" radius={[4, 4, 0, 0]} maxBarSize={30} stroke="#f43f5e" strokeWidth={1} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
