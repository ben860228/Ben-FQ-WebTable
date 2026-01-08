'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LiquidityWidgetProps {
    liquidCash: number;
    status: {
        hasCrisis: boolean;
        shortfall: number;
    };
    event?: any;
}

export default function LiquidityWidget({ liquidCash, status }: LiquidityWidgetProps) {
    const isHealthy = !status.hasCrisis;

    return (
        <div className={`glass-card rounded-[2rem] p-5 h-full flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${isHealthy ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            {/* Header Row */}
            <div className="flex justify-between items-center z-10 mb-2">
                <h3 className="text-sm font-medium text-slate-400">流動性 (Liquidity)</h3>
                <div className={`p-2 rounded-2xl ${isHealthy ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {isHealthy ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Status & Definition */}
            <div className="flex flex-col z-10">
                <p className={`text-lg font-bold ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isHealthy ? '健康 (Healthy)' : '注意 (Attention)'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                    健康定義: 可用現金 &gt; 下一筆重大支出
                </p>
            </div>

            <div className="mt-4 z-10">
                <p className="text-slate-400 text-xs mb-1">可用現金 (Liquid Cash)</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                    ${Math.round(liquidCash).toLocaleString()}
                </p>
                {!isHealthy && (
                    <div className="mt-2 text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-500/20">
                        缺口: -${status.shortfall.toLocaleString()}
                    </div>
                )}
            </div>

            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
    );
}
