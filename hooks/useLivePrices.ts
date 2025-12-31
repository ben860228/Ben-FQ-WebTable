import { useState, useEffect } from 'react';
import { Asset } from '@/lib/types';
import { getLivePrice } from '@/lib/mockData';

export interface PriceData {
    price: number;
    currency: string;
    changePercent?: number;
    symbol: string;
}

export function useLivePrices(assets: Asset[]) {
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            // Filter for assets that likely have market data
            const targetAssets = assets.filter(a =>
                a.Type === 'Stock' ||
                a.Type === 'Crypto' ||
                a.Name.startsWith('TW-') ||
                a.Name.startsWith('US-') ||
                a.Name.includes('-')
            );

            if (targetAssets.length === 0) {
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
                    // Try parsing JSON error
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
        // No polling, fetch once on mount/assets change
        // const interval = setInterval(fetchPrices, 300000); 
        // return () => clearInterval(interval);
    }, [assets]);

    // Helper to get price (Live > Mock)
    const getPrice = (name: string, currency: string) => {
        const live = prices[name];
        if (live) return live.price;
        return getLivePrice(name, currency);
    };

    return { prices, loading, error, getPrice };
}
