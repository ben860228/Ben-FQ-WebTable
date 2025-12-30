'use client';

import { Asset } from '@/lib/types';
import { Wallet } from 'lucide-react';

interface CashHoldingsProps {
    assets: Asset[];
}

export default function CashHoldings({ assets }: CashHoldingsProps) {
    // Determine if we should show grouped by Currency or Itemized
    // User asked for "List all bank positions", so let's list them directly
    // sorted by value
    // User asked for "List all bank positions" in original Google Sheet order
    const sortedAssets = assets;

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">現金部位 (Cash Holdings)</h3>
                    <p className="text-2xl font-bold text-white mt-1">帳戶明細</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {sortedAssets.map((asset) => {
                    const isJPY = asset.Currency === 'JPY';
                    const isUSD = asset.Currency === 'USD';
                    const isTWD = asset.Currency === 'TWD';

                    // Dynamic Styles based on Currency
                    let bgStyle = 'bg-slate-900/40 border-slate-800/50';
                    let iconStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                    let textStyle = 'text-slate-200 group-hover:text-emerald-400';

                    if (isJPY) {
                        bgStyle = 'bg-blue-950/20 border-blue-900/30';
                        iconStyle = 'bg-blue-900/20 text-blue-400 border-blue-800/50';
                        textStyle = 'text-blue-200 group-hover:text-blue-400';
                    } else if (isUSD) {
                        bgStyle = 'bg-amber-950/20 border-amber-900/30';
                        iconStyle = 'bg-amber-900/20 text-amber-400 border-amber-800/50';
                        textStyle = 'text-amber-200 group-hover:text-amber-400';
                    }

                    return (
                        <div key={asset.ID} className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${bgStyle}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border font-mono ${iconStyle}`}>
                                    {asset.Currency}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium transition-colors ${textStyle}`}>{asset.Name}</p>
                                    <p className="text-[10px] text-slate-500">{asset.Note || 'Account'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-bold font-mono tracking-tight ${isJPY ? 'text-blue-100' : isUSD ? 'text-amber-100' : 'text-white'}`}>
                                    {asset.Quantity.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
