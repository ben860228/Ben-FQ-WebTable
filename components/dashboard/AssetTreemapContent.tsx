'use client';

import { Asset } from '@/lib/types';
import { useMemo } from 'react';
// import { useLivePrices } from '@/hooks/useLivePrices';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

interface AssetTreemapContentProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

// Custom Tree Map Content
const CustomizedContent = (props: any) => {
    const { x, y, width, height, name, payload } = props;

    // 1. Hide Root Node (It usually covers the whole area)
    if (name === 'Root') return null;

    // 2. Safety Check
    if (!width || !height) return null;

    // 3. Get Data
    const change = payload?.change || 0;
    const isUp = change > 0;
    const isZero = change === 0;

    // 4. Color Logic
    // Up: Green (#10b981), Down: Red (#f43f5e), Zero: Gray (#64748b)
    const fillColor = isZero ? '#64748b' : (isUp ? '#10b981' : '#f43f5e');

    // 5. Render
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth={2}
            />
            {/* Show Name if space allows */}
            {width > 30 && height > 20 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                    dy={-6}
                    style={{ pointerEvents: 'none' }}
                >
                    {name}
                </text>
            )}
            {/* Show Change % if space allows */}
            {width > 30 && height > 34 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#rgba(255,255,255,0.9)"
                    fontSize={10}
                    dy={8}
                    style={{ pointerEvents: 'none' }}
                >
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </text>
            )}
        </g>
    );
};

export default function AssetTreemapContent({ assets, categoryMap = {} }: AssetTreemapContentProps) {
    const data = useMemo(() => {
        const leafNodes = assets.map(asset => {
            // Use Unit_Price directly from Google Sheet data
            // Default to 1 if missing to avoid zero-area in treemap (though we handle val<=0 later)
            // If Unit_Price is missing, it implies 0 or not set.
            const unitPrice = asset.Unit_Price ?? 0;

            let val = (asset.Quantity || 0) * unitPrice;

            // Hack for currency is likely no longer needed if Unit_Price is already in TWD (exchange rate applied)
            // BUT: If Unit_Price is the *asset price* in *original currency*, we might still need conversion?
            // "Unit_Price" in Asset Sheet usually means "Current Price" in Asset Currency.
            // Converting to TWD typically happens in `calculateNetWorth` or similar. 
            // In the previous Code: `getPrice` returned `prices[name].price` OR `mockData`.
            // The `mockData` or new logic usually returns raw price?
            // Actually, `Asset` interface in `types.ts` says `Unit_Price?: number; // Fetched from Google Sheet`.
            // In `lib/stocks.ts`: `prices[a.Name] = a.Unit_Price`.

            // Let's assume Unit_Price is properly set to the value we want (e.g. Exchange Rate for Fiat, Share Price for Stock).
            // However, we still need to handle Currency conversion for display validation if logic expects TWD.
            // The old code did:
            if (asset.Currency === 'USD') val *= 32.5;
            if (asset.Currency === 'JPY') val *= 0.22;

            // Ensure positive value for Treemap area
            if (val <= 0) val = 1;

            return {
                name: asset.Name,
                value: val,
                change: 0, // No live change data available from Sheet
                Category: asset.Category
            };
        }).sort((a, b) => b.value - a.value);

        // Wrap in Root for Recharts 2.x+ correctness
        return [{
            name: 'Root',
            children: leafNodes
        }];
    }, [assets]);

    // Check if we have leaf nodes
    const hasData = data && data.length > 0 && data[0].children && data[0].children.length > 0;
    // Extract first few items for debug
    const debugItems = hasData ? data[0].children.slice(0, 3) : [];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            // Don't show tooltip for Root
            if (data.name === 'Root') return null;

            return (
                <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs z-50">
                    <p className="font-bold text-white mb-1">{data.name}</p>
                    <p className="text-slate-400">Value: <span className="text-slate-200">${Math.round(data.value).toLocaleString()}</span></p>
                    {data.change !== undefined && (
                        <p className={`${data.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Change: {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col border border-slate-800 bg-slate-950 relative">
            <div className="mb-4 flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-medium text-slate-400">投資板塊 (Portfolio Map)</h3>
                    <p className="text-2xl font-bold text-white mt-1">資產熱力圖</p>
                </div>
                <div className="flex gap-2 text-[10px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div><span className="text-slate-400">漲 (Up)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500"></div><span className="text-slate-400">跌 (Down)</span></div>
                </div>
            </div>

            {!hasData ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                    <p className="text-slate-500 mb-2">No Assets Logic Found</p>
                    <div className="text-[10px] text-slate-600 font-mono bg-slate-900 p-2 rounded max-w-full overflow-auto text-left">
                        DEBUG:
                        Asset Count: {assets?.length || 0}
                        {/* Prices Count: {Object.keys(prices).length} */}
                        Data Structure: {JSON.stringify(data?.[0]?.children?.length || 'Empty')}
                    </div>
                </div>
            ) : (
                <div className="w-full h-[300px] relative flex justify-center overflow-hidden">
                    <Treemap
                        width={800}
                        height={300}
                        data={data}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#ffffff"
                        fill="#334155"
                        content={<CustomizedContent />}
                        isAnimationActive={false}
                    >
                        <Tooltip wrapperStyle={{ zIndex: 1000 }} content={<CustomTooltip />} />
                    </Treemap>
                </div>
            )}
        </div>
    );
}
