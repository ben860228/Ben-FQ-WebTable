import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Force dynamic to ensure we don't cache stale prices
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
        return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
    }

    const rawSymbols = symbolsParam.split(',');
    const symbolMap: Record<string, string> = {}; // raw -> yahoo
    const yahooSymbols: string[] = [];

    // 1. Map Symbols
    rawSymbols.forEach(raw => {
        let yahoo = raw;

        // Custom Mapping Logic
        if (raw === 'TW-00694B') {
            // Special Case: 富邦美債1-3 (TPEx / OTC)
            yahoo = '00694B.TWO';
        } else if (raw.startsWith('TW-')) {
            // "TW-2330" -> "2330.TW"
            yahoo = `${raw.replace('TW-', '')}.TW`;
        } else if (raw.startsWith('US-')) {
            // "US-VOO" -> "VOO"
            yahoo = raw.replace('US-', '');
        } else if (raw === 'MAX-USDT') {
            yahoo = 'USDT-USD';
        } else if (raw === '幣安-ETH' || raw === 'Trezor冷錢包-ETH') {
            yahoo = 'ETH-USD';
        } else if (raw.includes('-')) {
            // Fallback for things like "USDT-USD" if passed directly
            yahoo = raw;
        }

        symbolMap[raw] = yahoo;
        yahooSymbols.push(yahoo);
    });

    try {
        // 2. Fetch Quotes
        const results = await yahooFinance.quote(yahooSymbols);

        // 3. Transform Response
        // We want to return { "TW-2330": { price: 1000, ... }, ... }
        const responseData: Record<string, any> = {};

        // Yahoo might return a single object if only 1 symbol, or array.
        const resultArray = Array.isArray(results) ? results : [results];

        // Create a lookup for result items by their symbol
        const yahooResultMap = new Map();
        resultArray.forEach(item => {
            if (item && item.symbol) {
                yahooResultMap.set(item.symbol, item);
            }
        });

        // Map back to original keys
        Object.entries(symbolMap).forEach(([raw, yahoo]) => {
            const quote = yahooResultMap.get(yahoo);
            if (quote) {
                responseData[raw] = {
                    price: quote.regularMarketPrice,
                    currency: quote.currency,
                    changePercent: quote.regularMarketChangePercent,
                    symbol: quote.symbol
                };
            }
        });

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('Yahoo Finance Error:', error);
        // Instead of 500, return empty success so frontend doesn't spam errors
        // Ideally we should return partial success if some symbols worked, but for now:
        return NextResponse.json({});
    }
}
