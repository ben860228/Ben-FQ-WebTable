
import { Asset } from '../lib/types';
import { fetchStockPrices } from '../lib/stocks';

// Mock Assets with Unit_Price
const mockAssets: Asset[] = [
    {
        ID: 'A1',
        Type: 'Stock',
        Category: 'Invest',
        Name: 'TW-2330', // Should map to 2330.TW if map exists, or keep as name
        Quantity: 1000,
        Currency: 'TWD',
        Unit_Price: 1080 // Mock Price
    },
    {
        ID: 'A2',
        Type: 'Crypto',
        Category: 'Invest',
        Name: 'BTC',
        Quantity: 1,
        Currency: 'USD',
        Unit_Price: 95000 // Mock Price
    },
    {
        ID: 'A3',
        Type: 'Fiat',
        Category: 'Cash',
        Name: 'USD Account',
        Quantity: 100,
        Currency: 'USD',
        Unit_Price: 32.8 // Mock Exchange Rate
    }
];

async function runTest() {
    console.log('Testing fetchStockPrices with Mock Data...');
    const result = await fetchStockPrices(mockAssets);

    console.log('Status:', result.status);
    console.log('Prices:', result.prices);

    if (result.status === 'LIVE' && result.prices['TW-2330'] === 1080 && result.prices['BTC'] === 95000) {
        console.log('TEST PASSED: Prices correctly extracted from Unit_Price.');
    } else {
        console.error('TEST FAILED: Prices mismatch or status offline.');
    }
}

runTest();
