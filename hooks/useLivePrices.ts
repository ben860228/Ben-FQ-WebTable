import { useState, useEffect } from 'react';
import { Asset } from '@/lib/types';
import { getLivePrice } from '@/lib/financial-logic';

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
        // Disabled to remove redundant Yahoo Finance API calls.
        // Data should now come exclusively from Google Sheets (server-side).
        setLoading(false);
        /* 
        const fetchPrices = async () => {
             // ... existing logic ...
        };

        fetchPrices();
        */
    }, [assets]);

    // Helper to get price (Live > Mock)
    const getPrice = (name: string, currency: string) => {
        const live = prices[name];
        if (live) return live.price;
        return getLivePrice(name, currency);
    };

    return { prices, loading, error, getPrice };
}
