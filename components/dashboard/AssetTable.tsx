'use client';

import React from 'react';
import { Asset } from '@/lib/types';
import { useLivePrices } from '@/hooks/useLivePrices';

interface AssetTableProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

export default function AssetTable({ assets, categoryMap = {} }: AssetTableProps) {
    const { prices, loading, error, getPrice } = useLivePrices(assets);

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">投資組合 (Investments)</h3>
                    <p className="text-2xl font-bold text-white mt-1">持倉明細</p>
                </div>
                {/* Debug / Live Indicator */}
                <div className="flex items-center gap-2">
                    {loading && <span className="text-xs text-slate-400 animate-pulse">Updating...</span>}
                    {error && !loading && (
                        <span className="text-xs text-yellow-500 flex items-center gap-1" title={error}>
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Offline
                        </span>
                    )}
                    {!error && !loading && Object.keys(prices).length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
                        </div>
                    )}
                    {!error && !loading && Object.keys(prices).length === 0 && (
                        <div className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-500">
                            Offline (No Data)
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/60 text-xs text-slate-500 uppercase tracking-wider font-mono">
                            <th className="pb-4 font-medium pl-0">名稱 (Name)</th>
                            <th className="pb-4 font-medium text-right">數量 (Qty)</th>
                            <th className="pb-4 font-medium text-right">市價 (Price)</th>
                            <th className="pb-4 font-medium text-right">總值 (Value)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {assets.map((asset) => {
                            // 1. Try Live Price
                            const liveData = prices[asset.Name];

                            // 2. Get price using the hook's helper function
                            const price = getPrice(asset.Name, asset.Currency);

                            const estimatedValue = asset.Quantity * price;
                            const displayCat = categoryMap[asset.Category] || asset.Category;

                            // 3. Variables for rendering
                            const change = liveData?.changePercent || 0;
                            const isUp = change >= 0;
                            const hasChange = liveData?.changePercent !== undefined;

                            return (
                                <tr key={asset.Name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 pl-4 flex flex-col justify-center h-16">
                                        <div className="font-bold text-white text-sm">{asset.Name}</div>
                                        <div className="text-xs text-slate-500">{displayCat}</div>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="font-mono text-slate-200">{Number(asset.Quantity).toLocaleString()}</div>
                                        <div className="text-xs text-slate-500">{asset.Currency}</div>
                                    </td>
                                    <td className="py-3 text-right font-mono text-slate-200">
                                        ${price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </td>
                                    <td className="py-3 text-right">
                                        {hasChange && (
                                            <div className={`font-bold font-mono ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {isUp ? '+' : ''}{change.toFixed(2)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-right font-bold text-white font-mono">
                                        ${Math.round(estimatedValue).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
