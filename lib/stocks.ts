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
    console.log('[Stocks] Fetching from Yahoo API...'); // Log to server terminal
    const uniqueSymbols = new Set<string>();
    const missingMapAssets: string[] = [];

    assets.forEach(a => {
        if (TICKER_MAP[a.Name]) {
            uniqueSymbols.add(TICKER_MAP[a.Name]);
        }
        else if (TICKER_MAP[a.Name.toUpperCase()]) {
            uniqueSymbols.add(TICKER_MAP[a.Name.toUpperCase()]);
        }
        else if (a.Category === 'Stock' || a.Category === 'ETF' || a.Category === 'Crypto') {
            missingMapAssets.push(a.Name);
        }
    });

    if (uniqueSymbols.size === 0) {
        const msg = missingMapAssets.length > 0
            ? `No mapped symbols found. Unmapped: ${missingMapAssets.slice(0, 3).join(', ')}...`
            : 'No stock assets found.';
        return { prices: {}, status: 'OFFLINE', error: msg };
    }

    const symbols = Array.from(uniqueSymbols);

    try {
        const result = await yf.quote(symbols);
        const resultArray = Array.isArray(result) ? result : [result];

        if (!resultArray || resultArray.length === 0) {
            return { prices: {}, status: 'OFFLINE', error: 'API returned no data' };
        }

        const prices: Record<string, number> = {};

        resultArray.forEach((q: any) => {
            const price = q.regularMarketPrice || q.postMarketPrice;
            if (price) {
                prices[q.symbol] = price;
                Object.entries(TICKER_MAP).forEach(([userKey, ticker]) => {
                    if (ticker === q.symbol) {
                        prices[userKey] = price;
                    }
                });
            }
        });

        console.log('[Stocks] Fetch Success.');
        return { prices, status: 'LIVE' };

    } catch (error: any) {
        console.error('Stock API Fetch Failed:', error.message);
        return { prices: {}, status: 'OFFLINE', error: error.message || 'Library Error' };
    }
}

// Exported Cached Wrapper
// Cache for 300 seconds (5 minutes)
export const fetchStockPrices = unstable_cache(
    async (assets: Asset[]) => fetchStocksInternal(assets),
    ['stock-prices-v1'], // Cache key
    { revalidate: 300 }
);
