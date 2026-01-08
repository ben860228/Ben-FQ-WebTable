'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';

interface AssetAllocationProps {
    data: {
        name: string;
        value: number;
        color: string;
        details?: { name: string; value: number }[];
    }[];
}

export default function AssetAllocation({ data }: AssetAllocationProps) {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col overflow-visible">
            <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400">資產配置 (Allocation)</h3>
                <p className="text-2xl font-bold text-white mt-1">類別占比</p>
            </div>
            <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
                {mounted ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
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
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                wrapperStyle={{ zIndex: 1000 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const topItems = data.details || [];

                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl min-w-[200px]">
                                                <div className="pb-2 border-b border-slate-700 mb-2">
                                                    <p className="text-white font-medium mb-0.5" style={{ color: data.color }}>{data.name}</p>
                                                    <p className="text-slate-200 text-sm font-bold">
                                                        ${Number(data.value).toLocaleString()}
                                                    </p>
                                                    <p className="text-slate-500 text-xs">
                                                        {((Number(data.value) / totalValue) * 100).toFixed(1)}% of Total
                                                    </p>
                                                </div>

                                                {/* Details List */}
                                                {topItems.length > 0 && (
                                                    <div className="space-y-1">
                                                        {topItems.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800/30 pb-0.5 last:border-0">
                                                                <span className="truncate max-w-[120px] text-slate-300">{item.name}</span>
                                                                <span className="font-mono text-slate-500">${Math.round(item.value).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-slate-400 text-xs ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                    </div>
                )}

                {/* Center Text Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-white font-bold text-lg">${(totalValue / 1000).toFixed(0)}k</span>
                </div>
            </div>
        </div>
    );
}
