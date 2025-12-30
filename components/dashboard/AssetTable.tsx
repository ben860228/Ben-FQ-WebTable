'use client';

import React from 'react';
import { Asset } from '@/lib/types';
import { getLivePrice, CATEGORY_MAPPING } from '@/lib/mockData';

interface AssetTableProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

export default function AssetTable({ assets, categoryMap = {} }: AssetTableProps) {
    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">投資組合 (Investments)</h3>
                    <p className="text-2xl font-bold text-white mt-1">持倉明細</p>
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
                            // Logic: Price * Quantity * ExchangeRate
                            // In a real app, we'd fetch price. Here we use the mock helper or implied logic.
                            const price = getLivePrice(asset.Name, asset.Currency);
                            // If price is 1 (default), and it's not cash, it might look weird.
                            // But for Stocks/Crypto in mockData, we have some hardcoded prices.

                            const estimatedValue = asset.Quantity * price;
                            const displayCat = categoryMap[asset.Category] || asset.Category;

                            return (
                                <tr key={asset.ID} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4 pl-0">
                                        <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{asset.Name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono border border-slate-800 rounded px-1.5 py-0.5 inline-block mt-1">
                                            {displayCat}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-slate-400 font-mono text-sm">
                                        {asset.Quantity.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-slate-500 font-mono text-xs">
                                        ${price.toLocaleString()} <span className="opacity-50">{asset.Currency}</span>
                                    </td>
                                    <td className="p-4 text-right text-white font-bold tracking-tight font-mono">
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
