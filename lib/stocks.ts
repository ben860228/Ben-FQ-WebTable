import { Asset } from './types';
import YahooFinance from 'yahoo-finance2';
import { unstable_cache } from 'next/cache';

// In v3, the default export is the Class itself (or behaves like it for instantiation)
// We must instantiate it to use it.
const yf = new YahooFinance();

// Map user asset names to Yahoo Finance Tickers
const TICKER_MAP: Record<string, string> = {
    '006208': '006208.TW',
    'TW-006208': '006208.TW',
    '00694B': '00694B.TWO',  // TPEx
    'TW-00694B': '00694B.TWO',
    '2330': '2330.TW',
    'TW-2330': '2330.TW',
    'VOO': 'VOO',
    'BND': 'BND',
    'QQQ': 'QQQ',
    'AAPL': 'AAPL',
    'TSLA': 'TSLA',
    'NVDA': 'NVDA',
    'MSFT': 'MSFT',
    'GOOGL': 'GOOGL',
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD',
    'SOL': 'SOL-USD',
    'USDT': 'USDT-USD',
    'USDC': 'USDC-USD',
};

export interface StockData {
    prices: Record<string, number>;
    status: 'LIVE' | 'OFFLINE';
    error?: string;
}

// Internal Uncached Fetcher
async function fetchStocksInternal(assets: Asset[]): Promise<StockData> {
    console.log('[Stocks] Fetching from Google Sheet data...');

    if (!assets || assets.length === 0) {
        return { prices: {}, status: 'OFFLINE', error: 'No assets provided' };
    }

    const prices: Record<string, number> = {};
    let foundPrices = 0;

    assets.forEach(a => {
        // Use Unit_Price if available
        if (a.Unit_Price !== undefined && a.Unit_Price !== null) {
            prices[a.Name] = a.Unit_Price;

            // Still populate Ticker Map keys if they exist in the map, 
            // incase the frontend looks up by Ticker Map keys (though currently it seems to look up by Name).
            // Actually, looking at getLivePrice in mockData.ts (which we haven't seen but usage suggests),
            // it likely looks up by Name primarily.
            // But let's check TICKER_MAP for backward compat or just in case.
            if (TICKER_MAP[a.Name]) {
                prices[TICKER_MAP[a.Name]] = a.Unit_Price;
            }
            if (TICKER_MAP[a.Name.toUpperCase()]) {
                prices[TICKER_MAP[a.Name.toUpperCase()]] = a.Unit_Price;
            }

            foundPrices++;
        }
    });

    if (foundPrices === 0) {
        return { prices: {}, status: 'OFFLINE', error: 'No Unit_Price found in assets' };
    }

    console.log(`[Stocks] Extraction Success. Found prices for ${foundPrices} items.`);
    return { prices, status: 'LIVE' };
}

// Exported Cached Wrapper
// Cache for 300 seconds (5 minutes)
export const fetchStockPrices = unstable_cache(
    async (assets: Asset[]) => fetchStocksInternal(assets),
    ['stock-prices-v1'], // Cache key
    { revalidate: 300 }
);
