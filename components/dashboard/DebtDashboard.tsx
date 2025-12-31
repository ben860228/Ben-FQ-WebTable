'use client';

import { DebtDetail } from "@/lib/types";
import { Lock } from "lucide-react";

interface DebtDashboardProps {
    data: DebtDetail[];
    r33Name?: string; // Dynamic Name from Recurring Item
}

export default function DebtDashboard({ data, r33Name }: DebtDashboardProps) {
    // --- Logic for R33 (Credit) ---
    // Sort by Date
    const sortedData = [...(data || [])].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    const today = new Date();

    // Find Current Status: The distinct entry for "This Month" or "Next Payment"?
    // "Remaining Balance" usually means "Balance after last payment". 
    // If today is Dec 31, and last payment was Dec 27, then Balance of Dec 27 entry is current.
    // So we find the last entry with Date <= Today.
    // If table has future dates, we filter for <= Today.
    const pastEntries = sortedData.filter(d => new Date(d.Date) <= today);
    // If no past entries (new loan starts in future), use first entry.
    // If all past, use last.
    const currentStatus = pastEntries.length > 0 ? pastEntries[pastEntries.length - 1] : sortedData[0];

    // If data is empty entirely
    const hasData = data && data.length > 0;
    const currentBalance = currentStatus?.Balance || 0;
    const definedTotal = currentStatus?.Total_Loan || data?.[0]?.Total_Loan || 0;
    const maxBalance = definedTotal > 0 ? definedTotal : Math.max(...sortedData.map(d => d.Balance));

    const paidPercentage = maxBalance > 0 ? ((maxBalance - currentBalance) / maxBalance) * 100 : 0;

    // Next Payment Date: The first entry with Date > Today
    const nextPaymentEntry = sortedData.find(d => new Date(d.Date) > today);
    const nextPaymentDate = nextPaymentEntry?.Date || 'N/A';

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">

            {/* Left: Active Credit Table (R33) */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden group">
                {/* Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                                <h3 className="text-base font-bold text-white tracking-wide">
                                    {r33Name || '信用貸款'}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 font-mono ml-3.5">R33 / Credit Loan</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                                {paidPercentage.toFixed(1)}%
                            </div>
                            <p className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider">Paid Off</p>
                        </div>
                    </div>

                    {/* Linear Progress */}
                    <div className="mb-6">
                        <div className="overflow-hidden h-2.5 flex rounded-full bg-slate-800/80 border border-slate-700/50">
                            <div
                                style={{ width: `${paidPercentage}%` }}
                                className="shadow-lg flex flex-col justify-center bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out relative"
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/30"></div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                            <span>$0</span>
                            <span>{formatCurrency(maxBalance)}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">剩餘本金 (Balance)</p>
                            <p className="text-lg font-bold text-white font-mono">{formatCurrency(currentBalance)}</p>
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">本期月付 (Payment)</p>
                            <p className="text-lg font-bold text-white font-mono">{formatCurrency(currentStatus?.Payment || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Footer: Next Payment */}
                <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                    <p className="text-xs text-slate-400">下次繳款日 (Next Payment)</p>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-bold text-slate-200 font-mono">{nextPaymentDate}</span>
                    </div>
                </div>
            </div>

            {/* Right: Mortgage Placeholder (Waiting) */}
            <div className="bg-slate-900/20 backdrop-blur-sm rounded-2xl border border-dashed border-slate-800 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="p-4 bg-slate-900/80 rounded-full mb-4 border border-slate-800 shadow-xl">
                    <Lock className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-500 mb-2">房貸量表 (Mortgage)</h3>
                <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
                    此板塊尚未啟動。<br />當 R34 項目產生時將自動顯示。
                </p>
                <div className="absolute bottom-4 right-4 text-[10px] text-slate-700 font-mono">ID: R34</div>
            </div>

        </div>
    );
}
