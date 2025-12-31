'use client';

import React from 'react';
import { Asset } from '@/lib/types';
import { getLivePrice, CATEGORY_MAPPING } from '@/lib/mockData';

interface AssetTableProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

export default function AssetTable({ assets, categoryMap = {} }: AssetTableProps) {
    const [prices, setPrices] = React.useState<Record<string, { price: number; currency: string; changePercent?: number }>>({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchPrices = async () => {
            // Filter logic
            const targetAssets = assets.filter(a =>
                a.Type === 'Stock' ||
                a.Type === 'Crypto' ||
                a.Name.startsWith('TW-') ||
                a.Name.startsWith('US-') ||
                a.Name.includes('-')
            );

            if (targetAssets.length === 0) {
                console.log("No value assets found to fetch.");
                setLoading(false);
                return;
            }

            const symbols = Array.from(new Set(targetAssets.map(a => a.Name))).join(',');

            try {
                const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`);
                if (res.ok) {
                    const data = await res.json();
                    setPrices(data);
                    setError(null);
                } else {
                    try {
                        const errJson = await res.json();
                        setError(errJson.details || errJson.error || `API ${res.status}`);
                    } catch {
                        setError(`API ${res.status}`);
                    }
                }
            } catch (error: any) {
                console.error("Failed to fetch live prices", error);
                setError(error.message || 'Fetch Failed');
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 60000);
        return () => clearInterval(interval);
    }, [assets]);

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">投資組合 (Investments)</h3>
                    <p className="text-2xl font-bold text-white mt-1">持倉明細</p>
                </div>
                {/* Debug / Live Indicator */}
                <div className="flex gap-2">
                    {loading && (
                        <div className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 animate-pulse">
                            Connecting...
                        </div>
                    )}
                    {error && (
                        <div className="px-2 py-1 rounded bg-rose-900/30 border border-rose-800 text-[10px] text-rose-400">
                            Error: {error}
                        </div>
                    )}
                    {!loading && !error && Object.keys(prices).length === 0 && (
                        <div className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-500">
                            Offline (No Data)
                        </div>
                    )}
                    {!loading && !error && Object.keys(prices).length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
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

                            // 2. Fallback to mock logic if no live data
                            let price = liveData?.price ?? getLivePrice(asset.Name, asset.Currency);

                            // 3. For pure Cash/Fiat that didn't get a quote, ensure price is 1 if it's implicitly base currency or not handled
                            // But keep logic simple: trust getLivePrice or API.

                            const estimatedValue = asset.Quantity * price;
                            const displayCat = categoryMap[asset.Category] || asset.Category;

                            const isLive = !!liveData;

                            return (
                                <tr key={asset.ID} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="py-2 px-4 pl-0">
                                        <div className="flex items-center gap-2">
                                            <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{asset.Name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono border border-slate-800 rounded px-1.5 py-0.5 whitespace-nowrap">
                                                {displayCat}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 text-right text-slate-400 font-mono text-sm">
                                        {asset.Quantity.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-4 text-right text-slate-500 font-mono text-xs">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {/* Price */}
                                            <span>${price.toLocaleString()}</span>
                                            <span className="opacity-50">{liveData?.currency || asset.Currency}</span>
                                        </div>
                                        {/* Change % if available */}
                                        {liveData?.changePercent !== undefined && (
                                            <div className={`text-[10px] ${liveData.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 px-4 text-right text-white font-bold tracking-tight font-mono">
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
