'use client';

import { Asset } from '@/lib/types';
import { getLivePrice, CATEGORY_MAPPING } from '@/lib/mockData';
import { useMemo } from 'react';

interface AssetTreemapContentProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

export default function AssetTreemapContent({ assets, categoryMap = {} }: AssetTreemapContentProps) {
    const processedData = useMemo(() => {
        let totalValue = 0;
        const items = assets.map(asset => {
            let val = (asset.Quantity || 0) * getLivePrice(asset.Name, asset.Currency);

            // Hack for currency conversion if not handled in getLivePrice
            if (asset.Currency === 'USD') val *= 32.5;
            if (asset.Currency === 'JPY') val *= 0.22;

            if (val <= 0) val = 1000; // Force visibility
            totalValue += val;

            // Color logic
            let color = '#64748b'; // slate-500
            const cat = asset.Category || 'Uncategorized';
            if (cat === 'Crypto') color = '#F59E0B';
            else if (cat === 'Stock') color = '#3B82F6';
            else if (cat === 'ETF') color = '#6366F1';
            else if (cat === 'Fiat' || cat === 'Cash') color = '#10B981';
            else if (cat === 'Invest' || cat === 'Savings') color = '#8B5CF6';

            // Use Dynamic Map
            const translatedCat = categoryMap[cat] || cat;

            return { ...asset, val, color, translatedCat };
        }).sort((a, b) => b.val - a.val);

        return { items, totalValue };
    }, [assets, categoryMap]);

    if (processedData.items.length === 0) {
        return (
            <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950 items-center justify-center">
                <p className="text-slate-500">No Assets Found</p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-400">投資板塊 (Portfolio Map)</h3>
                <p className="text-2xl font-bold text-white mt-1">資產分佈</p>
            </div>
            <div className="flex-1 w-full min-h-0 flex flex-wrap content-start gap-1 overflow-hidden relative rounded-xl bg-slate-900/50 p-1">
                {processedData.items.map((item) => {
                    const percent = (item.val / processedData.totalValue) * 100;
                    // Min width checking
                    const widthStyle = `${percent}%`;
                    const isTooSmall = percent < 5;

                    return (
                        <div
                            key={item.ID}
                            style={{ width: widthStyle, backgroundColor: item.color }}
                            className={`h-full min-h-[40px] flex-grow relative group transition-all hover:brightness-110 flex items-center justify-center border border-slate-950 box-border rounded-sm ${percent < 1 ? 'min-w-[1%]' : ''}`}
                            title={`${item.Name}: $${Math.round(item.val).toLocaleString()}`}
                        >
                            <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/20 z-10" />
                            {!isTooSmall && (
                                <div className="z-20 text-center px-1 overflow-hidden">
                                    <div className="text-[10px] md:text-xs font-bold text-white truncate drop-shadow-md">{item.Name}</div>
                                    <div className="text-[9px] text-white/80 font-mono hidden md:block">{percent.toFixed(1)}%</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
                {[
                    { l: '股票 (Stock)', c: '#3B82F6' },
                    { l: '加密貨幣 (Crypto)', c: '#F59E0B' },
                    { l: '現金 (Cash)', c: '#10B981' },
                    { l: 'ETF', c: '#6366F1' }
                ].map(i => (
                    <div key={i.l} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: i.c }} />
                        <span className="text-xs text-slate-400">{i.l}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
