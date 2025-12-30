'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AssetAllocationProps {
    data: {
        name: string;
        value: number;
        color: string;
    }[];
}

export default function AssetAllocation({ data }: AssetAllocationProps) {
    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400">資產配置 (Allocation)</h3>
                <p className="text-2xl font-bold text-white mt-1">類別占比</p>
            </div>
            <div className="flex-1 w-full min-h-0 relative">
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
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: 'none' }}
                            itemStyle={{ color: '#f8fafc' }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => <span className="text-slate-400 text-xs ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text Overlay */}
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                    <span className="text-xs text-slate-500 block">Total</span>
                    <span className="text-white font-bold text-lg">100%</span>
                </div>
            </div>
        </div>
    );
}
