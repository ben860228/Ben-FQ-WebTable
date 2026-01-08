'use client';

import React from 'react';
import { Asset } from '@/lib/types';
import { getLivePrice, getExchangedValue } from '@/lib/financial-logic';
import { TrendingUp } from 'lucide-react';

interface AssetTableProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
    stockPrices?: Record<string, number>; // Server-fetched prices
    rates?: Record<string, number>; // Exchange rates
}

export default function AssetTable({ assets, categoryMap = {}, stockPrices = {}, rates = {} }: AssetTableProps) {

    // Calculate total value for % calculation
    const totalValue = assets.reduce((sum, asset) => {
        const rate = rates[asset.Currency] || 1;
        const price = getLivePrice(asset.Name, asset.Currency, stockPrices);
        return sum + (asset.Quantity * price * rate);
    }, 0);

    return (
        <div className="glass-card rounded-[2rem] p-5 h-full max-h-full flex flex-col border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-medium text-slate-400">投資組合 (Investments)</h3>
                    <p className="text-xl font-bold text-white mt-0.5">持倉明細</p>
                </div>
                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
            </div>

            <div className="overflow-x-auto flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-slate-950 z-10 shadow-sm shadow-slate-900/50">
                        <tr className="border-b border-slate-800/60 text-xs text-slate-500 uppercase tracking-wider font-mono">
                            <th className="pb-4 pt-1 font-medium pl-0">名稱 (Name)</th>
                            <th className="pb-4 pt-1 font-medium text-right">數量 (Qty)</th>
                            <th className="pb-4 pt-1 font-medium text-right">市價 (Price)</th>
                            <th className="pb-4 pt-1 font-medium text-right">總值 (TWD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {assets.map((asset) => {
                            // 1. Get Live Price
                            const price = getLivePrice(asset.Name, asset.Currency, stockPrices);
                            const rate = rates[asset.Currency] || 1;

                            // 2. Calculate TWD Value
                            const estimatedValue = asset.Quantity * price * rate;
                            const displayCat = categoryMap[asset.Category] || asset.Category;

                            // 3. Check Conversion for Star
                            const isConverted = asset.Currency !== 'TWD';
                            const star = isConverted ? '*' : '';

                            return (
                                <tr key={asset.Name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 pl-4 flex flex-col justify-center h-16">
                                        <div className="font-bold text-white text-sm">{asset.Name}</div>
                                        <div className="text-xs text-slate-500">{displayCat}</div>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="font-mono text-slate-200">{Number(asset.Quantity).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 text-right font-mono text-slate-200">
                                        {/* Display original currency price */}
                                        {asset.Currency !== 'TWD' ? asset.Currency : ''} ${price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 pr-4 text-right font-bold text-white font-mono">
                                        {star}${Math.round(estimatedValue).toLocaleString()}
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
