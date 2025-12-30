import { Asset, RecurringItem, OneOffEvent } from './types';

// Exchange Rates (Mock for now, will replace with API later)
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 32.5,
    'JPY': 0.22,
    'TWD': 1,
};

export function getExchangeRate(currency: string): number {
    return EXCHANGE_RATES[currency] || 1;
}

export const CATEGORY_MAPPING: Record<string, string> = {
    'Housing': '居住',
    'Food': '餐飲',
    'Transport': '交通',
    'Utility': '水電瓦斯',
    'Insurance': '保險',
    'Medical': '醫療',
    'Entertainment': '娛樂',
    'Learning': '學習',
    'Subscription': '訂閱服務',
    'Family': '孝親/家庭',
    'Tax': '稅務',
    'Savings': '儲蓄',
    'Invest': '投資',
    'Other': '其他',
    'Crypto': '加密貨幣',
    'Stock': '股票',
    'Cash': '現金',
    'ETF': 'ETF',
    'Fiat': '現金',
    'General': '一般',
    'Uncategorized': '未分類'
};

export function getLivePrice(assetName: string, currency: string): number {
    const name = assetName.toUpperCase();

    // TWD Stocks
    if (name.includes('006208')) return 115; // Recent
    if (name.includes('00694B')) return 15.2;
    if (name.includes('2330')) return 1085; // Recent

    // US ETFs/Stocks
    if (name.includes('VOO')) return 632.6; // Recent
    if (name.includes('BND')) return 74.3;
    if (name.includes('QQQ')) return 510;
    if (name.includes('AAPL')) return 273;
    if (name.includes('TSLA')) return 460;
    if (name.includes('NVDA')) return 188;
    if (name.includes('MSFT')) return 487;
    if (name.includes('GOOGL')) return 311;

    // Crypto
    if (name.includes('BTC')) return 87300;
    if (name.includes('ETH')) return 2970;
    if (name.includes('SOL')) return 124;
    if (name.includes('USDT')) return 1;
    if (name.includes('USDC')) return 1;

    // Fallbacks
    if (name === '2330') return 1085;
    if (name === 'VOO') return 632.6;

    return 1.0;
}

// Logic: Calculate Total Net Worth from Assets
export function calculateNetWorth(assets: Asset[]): number {
    return assets.reduce((total, asset) => {
        const rate = getExchangeRate(asset.Currency);
        const price = getLivePrice(asset.Name, asset.Currency);
        // Quantity * Price * Rate
        return total + (asset.Quantity * price * rate);
    }, 0);
}

// Logic: Generate Cash Flow Data (Monthly)
export function calculateCashFlow(recurringItems: RecurringItem[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.map((month, index) => {
        let income = 0;
        let expense = 0;

        recurringItems.forEach(item => {
            const rate = getExchangeRate(item.Currency);
            const amount = item.Amount_Base * rate;
            const freq = parseInt(item.Frequency) || 12; // Default to monthly if parse fails

            // Simple logic: If frequency is 12 (monthly), add every month.
            // If specific month is set, only add then.

            let applies = false;
            if (freq === 12) applies = true;
            else if (item.Specific_Month === index + 1) applies = true;
            // Add more frequency logic here (e.g. quarterly) if needed

            if (applies) {
                if (item.Type === 'Income') income += amount;
                else expense += amount;
            }
        });

        return {
            monthLabel: month,
            income,
            expense,
            net: income - expense
        };
    });
}

// Logic: Asset Allocation
export function calculateAllocation(assets: Asset[]) {
    const allocation: Record<string, number> = {};

    assets.forEach(asset => {
        const rate = getExchangeRate(asset.Currency);
        const price = getLivePrice(asset.Name, asset.Currency);
        const value = asset.Quantity * price * rate;

        // Group by Category
        const rawCategory = asset.Category || 'Other';
        const category = CATEGORY_MAPPING[rawCategory] || rawCategory;

        allocation[category] = (allocation[category] || 0) + value;
    });

    // Tech Palette Colors
    const PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#EC4899'];

    return Object.entries(allocation).map(([name, value], index) => ({
        name,
        value,
        color: PALETTE[index % PALETTE.length]
    }));
}

// Logic: Liquidity Monitor
export function checkLiquidity(assets: Asset[], recurringItems: RecurringItem[], oneOffs: OneOffEvent[]) {
    // 1. Calculate liquid cash (Category = 'Cash' or 'Fiat')
    const liquidCash = assets
        .filter(a => a.Category === 'Cash' || a.Type === 'Fiat')
        .reduce((sum, a) => sum + (a.Quantity * getExchangeRate(a.Currency)), 0);

    // 2. Find next big negative event (Expense)
    const nextCrisis = oneOffs
        .filter(e => e.Type === 'Expense' && new Date(e.Date) > new Date())
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())[0];

    const hasCrisis = nextCrisis && nextCrisis.Amount > liquidCash;

    return {
        liquidCash,
        hasCrisis: !!hasCrisis,
        shortfall: hasCrisis ? nextCrisis.Amount - liquidCash : 0
    };
}
