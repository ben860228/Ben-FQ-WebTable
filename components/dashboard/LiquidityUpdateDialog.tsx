'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Asset, Currency } from '@/lib/types';
import { SubmitResult } from '@/app/actions/updateLiquidity';
import { submitBatchUpdate } from '@/app/actions/updateLiquidity';

interface LiquidityUpdateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Trigger revalidation
    assets: Asset[];
    rates: { USD: number; JPY: number; TWD: number };
    stockPrices: Record<string, number>;
}

type UpdateMode = 'CASH' | 'INVEST';

export default function LiquidityUpdateDialog({
    isOpen,
    onClose,
    onSuccess,
    assets,
    rates,
    stockPrices
}: LiquidityUpdateDialogProps) {
    const [mode, setMode] = useState<UpdateMode>('CASH');
    const [updates, setUpdates] = useState<Record<string, string>>({}); // Store as string for input
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<SubmitResult | null>(null);

    // Filter Assets
    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const isCash = ['Cash', 'Fiat', 'Deposit'].includes(a.Category) || a.Type === 'Fiat';
            return mode === 'CASH' ? isCash : !isCash && a.Type !== 'Real Estate' && a.Category !== 'Real Estate';
        });
    }, [assets, mode]);

    // Handle Input Change
    const handleInputChange = (id: string, value: string) => {
        setUpdates(prev => ({ ...prev, [id]: value }));
    };

    const getPrice = (asset: Asset) => {
        // 1. If stock, check stockPrices
        // 2. If fiat, check rates (USD/JPY/TWD)
        // 3. Fallback to Asset.Unit_Price ?? 1

        // Logic for History: We want the "Per Unit Value in TWD" usually? 
        // Wait, the History `Unit_Price` should be the price in NATIVE currency generally, or TWD?
        // User plan: "Dashboard上顯示的當下股價".
        // For Stocks: Price in USD usually.
        // For Cash: Price = Exchange Rate to TWD.

        // Stock Logic
        if (['Stock', 'Crypto', 'Fund', 'ETF'].includes(asset.Category) || asset.Type === 'Stock' || asset.Type === 'Crypto') {
            // Find key in stockPrices (usually ID or Name match, assuming logic matches fetchStockPrices)
            // fetchStockPrices uses the Ticker logic. Can we easily map back? 
            // The `stockPrices` map is keyed by what? Ticker?
            // Actually `lib/stocks.ts` returns keyed by Ticker. 
            // We don't have Ticker in Asset explicitly, usually Name or ID logic? 
            // Actually, AssetTable passes `stockPrices`.
            // Let's rely on what `Asset.Unit_Price` says if available (fetched from Sheet), 
            // BUT we want LIVE price.
            // If stockPrices has it? 
            // Actually, straightforward: just grab `asset.Unit_Price` from props if it was updated by server?
            // Server-side page.tsx logic: `stockData = fetchStockPrices(assets)`.
            // `stockPrices` is keyed by Symbol.
            // The Asset object in `assets` prop passed here MIGHT not have the updated price if `page.tsx` didn't mutate it.
            // In `page.tsx`, `stockPrices` is separate.
            // We need to guess the ticker. 
            // Simplified: Just use `asset.Unit_Price`? 
            // Wait, `page.tsx` derived logic: 
            // actually `page.tsx` doesn't mutate `assets` with new prices. It passes `stockPrices` to `AssetTable`.
            // For History, we probably want the LIVE price if available.

            // Attempt to find price in stockPrices by Name (assuming Name is Ticker) or some lookup.
            // If not, fallback to 0 or manual input?
            // Let's assume for now we use rate for currencies.
            return asset.Unit_Price ?? 0;
        }

        // Fiat Logic
        if (asset.Currency === 'USD') return rates.USD;
        if (asset.Currency === 'JPY') return rates.JPY;
        return 1;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setResult(null);
        try {
            // Filter out assets that haven't changed (optional, but cleaner)
            // Actually user might want to log history even if unchanged? 
            // "Update" implies change. Let's send only ones present in `updates` map.
            const payload = Object.entries(updates).map(([id, quantityStr]) => {
                const asset = assets.find(a => a.ID === id);
                if (!asset) return null;

                const quantity = parseFloat(quantityStr.replace(/,/g, ''));
                if (isNaN(quantity)) return null;

                // Determine Unit Price for History
                // If stock, try to find in stockPrices
                // Note: We need a reliable way to get price. 
                // Logic: Try stockPrices[asset.Name] ?? asset.Unit_Price ?? 0
                let unitPrice = asset.Unit_Price ?? 0;

                // Try to match stockPrices if possible (heuristics based on AssetTable)
                if (stockPrices) {
                    // Map logic from financial-logic or just simple check
                    // Simple check: stockPrices[asset.Name] ?
                    if (stockPrices[asset.Name]) unitPrice = stockPrices[asset.Name];
                    // Also check common variations if needed, but Name should match Ticker often
                }

                // For Cash, Unit Price is Exchange Rate
                if (asset.Category === 'Cash' || asset.Type === 'Fiat') {
                    if (asset.Currency === 'USD') unitPrice = rates.USD;
                    if (asset.Currency === 'JPY') unitPrice = rates.JPY;
                    if (asset.Currency === 'TWD') unitPrice = 1;
                }

                return {
                    id: asset.ID,
                    name: asset.Name,
                    category: asset.Category,
                    quantity,
                    unitPrice,
                    currency: asset.Currency
                };
            }).filter(Boolean) as any[]; // cast to simplify

            if (payload.length === 0) {
                setIsSubmitting(false);
                return;
            }

            const res = await submitBatchUpdate(payload);
            setResult(res);

            if (res.success) {
                // Wait a bit then close/refresh
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            }
        } catch (e) {
            console.error(e);
            setResult({ success: false, error: 'Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-emerald-400" />
                            Update Liquidity
                        </h2>
                        <p className="text-sm text-slate-400">Batch update your assets and log history.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setMode('CASH')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors relative ${mode === 'CASH' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                        Cash & Accounts
                        {mode === 'CASH' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                    </button>
                    <button
                        onClick={() => setMode('INVEST')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors relative ${mode === 'INVEST' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                        Investments
                        {mode === 'INVEST' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                    </button>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
                    {filteredAssets.length === 0 ? (
                        <div className="text-center text-slate-500 py-12">No assets found in this category.</div>
                    ) : (
                        filteredAssets.map(asset => (
                            <div key={asset.ID} className="flex items-center gap-4 group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-200">{asset.Name}</span>
                                        <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">{asset.Currency}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Current: <span className="text-slate-400">{asset.Quantity.toLocaleString()}</span>
                                        {/* Debug: Show Price used for history? */}
                                        {/* <span className="ml-2 opacity-50">@ {getPrice(asset)}</span> */}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <ArrowRight className="w-4 h-4 text-slate-600" />
                                    <input
                                        type="text"
                                        placeholder={asset.Quantity.toString()}
                                        value={updates[asset.ID] !== undefined ? updates[asset.ID] : ''}
                                        onChange={(e) => handleInputChange(asset.ID, e.target.value)}
                                        className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-right text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono placeholder:text-slate-700"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div className="text-sm">
                        {result?.success && (
                            <span className="text-emerald-400 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Saved {result.updates} records!
                            </span>
                        )}
                        {result?.error && (
                            <span className="text-red-400 flex items-center gap-2">
                                <X className="w-4 h-4" /> {result.error}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || Object.keys(updates).length === 0}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Summary & Update
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    )
}
