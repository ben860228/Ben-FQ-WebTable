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
export function calculateCashFlow(recurringItems: RecurringItem[], currentTotalAssets: number = 0) {
    // Generate future 12 months starting from next month
    const today = new Date();
    const data = [];
    let accumulatedNetWorth = currentTotalAssets;

    for (let i = 1; i <= 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // "Jan 2026"
        const monthIndex = d.getMonth() + 1; // 1-12

        let income = 0;
        let expense = 0;
        let savings = 0;
        const incomeItems: { name: string; amount: number; id: number }[] = [];
        const expenseItems: { name: string; amount: number; id: number }[] = [];
        const savingsItems: { name: string; amount: number; id: number }[] = [];

        recurringItems.forEach(item => {
            const rate = getExchangeRate(item.Currency);
            const amount = item.Amount_Base * rate;

            // Robust Frequency Logic
            let freq = 12; // Default Monthly
            const rawFreq = String(item.Frequency).toLowerCase();

            if (rawFreq === 'year' || rawFreq === 'yearly' || rawFreq === '1') freq = 1;
            else if (rawFreq === 'month' || rawFreq === 'monthly' || rawFreq === '12') freq = 12;
            else {
                const parsed = parseInt(item.Frequency);
                if (!isNaN(parsed)) freq = parsed;
            }

            // Date Range Check
            const itemStart = item.Start_Date ? new Date(item.Start_Date) : null;
            const itemEnd = item.End_Date ? new Date(item.End_Date) : null;

            // Allow active items (no end date or end date > current month)
            // ... (keep existing date logic simplified or reused)

            // Strict Date Handling: 
            // If item starts AFTER this month, skip
            if (itemStart && itemStart > new Date(d.getFullYear(), d.getMonth() + 1, 0)) return;
            // If item ends BEFORE this month, skip
            if (itemEnd && itemEnd < d) return;

            let applies = false;
            // Frequency Application
            if (freq === 12) {
                applies = true;
            } else if (freq === 1) {
                // Yearly: Check Specific Month
                const targetMonth = item.Specific_Month || 1;
                if (targetMonth === monthIndex) applies = true;
            }

            if (applies) {
                if (item.Type === 'Income') {
                    income += amount;
                    incomeItems.push({ name: item.Name, amount, id: Number(item.ID) || 0 });
                } else {
                    // Check for Savings
                    const cat = item.Category || '';
                    const isSaving = cat === 'Savings' || cat === 'Invest' || cat === 'Startups' || item.Name.includes('儲蓄') || item.Name.includes('存錢');

                    if (isSaving) {
                        savings += amount;
                        savingsItems.push({ name: item.Name, amount, id: Number(item.ID) || 0 });
                    } else {
                        expense += amount;
                        expenseItems.push({ name: item.Name, amount, id: Number(item.ID) || 0 });
                    }
                }
            }
        });

        // Net Flow = Income - Expense - Savings (Savings is basically cash outflow to assets, so technically expense in cash flow terms, but we separate it visually)
        // Actually, usually Net Flow = Income - Expenses. Savings is efficient use of Net Flow.
        // If we want "Flow", Net Flow = Income - Outflow.
        // User wants ProjectNetWorth.
        // If I put money in Savings, is it gone? No, it's in Assets.
        // So for Net Worth calculation:
        // Income adds to NW. Expense subtracts from NW. Savings moves Cash to Asset (Zero NW change, or positive if Appreciates).
        // But here we are projecting generic liquid NW.
        // Let's assume Income adds + Expense substracts = Net Flow. 
        // Savings -> If it's transfer to Asset, it's still part of NW.
        // So Net Flow (Change in Net Worth) = Income - Expense (Consumption).
        // Savings should NOT subtract from Accumulated Net Worth logic compared to consumption.
        // But strictly cash flow: Cash goes down.
        // Let's stick to User's "Projected NW".
        // Accumulated NW += (Income - Expense). Savings is retained.
        const netFlow = income - expense - savings; // Pure cash flow change (Cash Wallet)
        // But projected NW should include savings? 
        // Real Net Worth Change = Income - Consumption Expense.
        // So Accumulated += Income - Expense. (Savings is still your money).

        accumulatedNetWorth += (income - expense);

        data.push({
            monthLabel,
            income,
            expense,
            savings,
            net: income - expense - savings, // Cash Flow Net
            projectedNW: accumulatedNetWorth,
            details: {
                income: incomeItems,
                expense: expenseItems,
                savings: savingsItems
            }
        });
    }

    return data;
}

// Logic: Asset Allocation
export function calculateAllocation(assets: Asset[]) {
    const allocation: Record<string, number> = {};
    const details: Record<string, { name: string; value: number; id: string }[]> = {};

    assets.forEach((asset, index) => {
        const rate = getExchangeRate(asset.Currency);
        const price = getLivePrice(asset.Name, asset.Currency);
        const value = asset.Quantity * price * rate;

        // Group by Category
        const rawCategory = asset.Category || 'Other';
        const category = CATEGORY_MAPPING[rawCategory] || rawCategory;

        allocation[category] = (allocation[category] || 0) + value;

        if (!details[category]) details[category] = [];
        // Use Asset ID or index as string backup
        details[category].push({
            name: asset.Name,
            value,
            id: asset.ID ? String(asset.ID) : String(index)
        });
    });

    // Tech Palette Colors
    const PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#EC4899'];

    return Object.entries(allocation).map(([name, value], index) => {
        // Sort details by ID
        const sortedDetails = (details[name] || []).sort((a, b) => {
            // Try numeric sort first
            const numA = parseInt(a.id);
            const numB = parseInt(b.id);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            // Fallback to string sort
            return a.id.localeCompare(b.id);
        });

        return {
            name,
            value,
            color: PALETTE[index % PALETTE.length],
            details: sortedDetails
        };
    });
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
