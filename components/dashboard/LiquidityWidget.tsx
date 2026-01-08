'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LiquidityWidgetProps {
    liquidCash: number;
    status: {
        hasCrisis: boolean;
        shortfall: number;
    };
    event?: any;
    breakdown?: {
        liquid: {
            total: number;
            cash: number;
            stock: number;
            crypto: number;
            other: number;
        };
        fixed: {
            total: number;
            house: number;
            insurance: number;
            r09?: number;
            r10?: number;
            r09Name?: string;
            r10Name?: string;
        };
    };
}

export default function LiquidityWidget({ liquidCash, status, breakdown }: LiquidityWidgetProps) {
    const isHealthy = !status.hasCrisis;
    const format = (v: number) => Math.round(v).toLocaleString();

    return (
        <div className={`glass-card rounded-[2rem] p-5 h-full flex flex-col justify-start relative overflow-hidden transition-all duration-500 ${isHealthy ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            {/* Header Row: items-center to match other cards */}
            <div className="flex justify-between items-center z-10 mb-4 h-8">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">資產結構 (Structure)</h3>
                </div>
                <div className={`p-2 rounded-2xl ${isHealthy ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {isHealthy ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Breakdown Content */}
            <div className="space-y-3 z-10 flex-1">
                {breakdown && (
                    <div className="grid grid-cols-2 gap-3 h-full">
                        {/* Liquid Assets */}
                        <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50 flex flex-col">
                            <div className="flex justify-between items-baseline mb-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">流動 (Liquid)</p>
                                <p className="text-sm font-bold text-blue-400 font-mono">${format(breakdown.liquid.total)}</p>
                            </div>
                            {/* Sub-categories */}
                            <div className="space-y-1.5 flex-1">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>現金 (Cash)</span>
                                    <span className="font-mono text-slate-300">${format(breakdown.liquid.cash)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>股票 (Stock)</span>
                                    <span className="font-mono text-slate-300">${format(breakdown.liquid.stock)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>加密 (Crypto)</span>
                                    <span className="font-mono text-slate-300">${format(breakdown.liquid.crypto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Assets */}
                        <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50 flex flex-col">
                            <div className="flex justify-between items-baseline mb-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">固定 (Fixed)</p>
                                <p className="text-sm font-bold text-amber-400 font-mono">${format(breakdown.fixed.total)}</p>
                            </div>
                            {/* Sub-categories */}
                            <div className="space-y-1.5 flex-1">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>房產 (House)</span>
                                    <span className="font-mono text-slate-300">${format(breakdown.fixed.house)}</span>
                                </div>
                                {/* Splitting Insurance with Dynamic Names */}
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span title={breakdown.fixed.r09Name}>{breakdown.fixed.r09Name || 'R09'}</span>
                                    <span className="font-mono text-slate-300 ml-2">${format(breakdown.fixed.r09 || 0)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span title={breakdown.fixed.r10Name}>{breakdown.fixed.r10Name || 'R10'}</span>
                                    <span className="font-mono text-slate-300 ml-2">${format(breakdown.fixed.r10 || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
    );
}
