import { Asset, RecurringItem, OneOffEvent, InsuranceDetail } from './types';
import { ExchangeRates } from './currency';

export function calculateFixedAssets(
    oneOffEvents: OneOffEvent[],
    insuranceDetails: Record<string, InsuranceDetail[]>,
    rates: ExchangeRates
) {
    const today = new Date();

    // 1. House Equity (From One-Off Events)
    const houseEquity = oneOffEvents
        .filter(e => e.Category === 'House' && new Date(e.Date) <= today)
        .reduce((sum, e) => sum + e.Amount, 0);

    // 2. Insurance Cash Value (R09, R10)
    const getInsuranceValue = (id: string) => {
        const details = insuranceDetails[id];
        if (!details || details.length === 0) return 0;
        // Sort by Date
        const sorted = [...details].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        // Find the latest record *before or on* today
        // Actually, the sheet often has "Year End" dates.
        // We usually want the "Current Policy Year" value.
        // Simple logic: Find the latest record with Date <= Today.
        // If today < first record, value is 0 (or first record's value? No, 0).
        let value = 0;
        for (const d of sorted) {
            if (new Date(d.Date) <= today) {
                value = d.Cash_Value;
            } else {
                break;
            }
        }
        // If no past record is found (policy just started or data future-dated), maybe check if policy started?
        // Fallback: if today > sorted[0].Date but no entry?? Logic above covers it.
        // What if today is before the first "Year End"? Technically Cash Value might be 0 or accumulating.
        // Let's assume 0 if before first year end in CSV.
        return value;
    };

    // R09 (USD) -> Convert to TWD
    const r09ValueUSD = getInsuranceValue('R09');
    const r09ValueTWD = r09ValueUSD * getRate('USD', rates);

    // R10 (TWD)
    const r10ValueTWD = getInsuranceValue('R10');

    const totalFixed = Math.round(houseEquity + r09ValueTWD + r10ValueTWD);

    return {
        total: totalFixed,
        house: Math.round(houseEquity),
        insurance: Math.round(r09ValueTWD + r10ValueTWD),
        r09: Math.round(r09ValueTWD),
        r10: Math.round(r10ValueTWD)
    };
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

// Start Helper: Get Exchange Rate
export function getRate(assetCurrency: string, rates: ExchangeRates): number {
    if (assetCurrency === 'USD') return rates.USD;
    if (assetCurrency === 'JPY') return rates.JPY;
    return 1;
}

// Helper: Calculate Exchanged Value
export function getExchangedValue(baseValue: number, currency: string, rates: ExchangeRates): number {
    return baseValue * getRate(currency, rates);
}

export function getLivePrice(assetName: string, currency: string, priceMap: Record<string, number> = {}): number {
    // 1. Check Live Map first
    if (priceMap[assetName]) return priceMap[assetName];

    // 2. Check uppercase name (just in case)
    const name = assetName.toUpperCase();
    if (priceMap[name]) return priceMap[name];

    // 3. Fallbacks (Offline Backup)
    // TWD Stocks
    if (name.includes('006208')) return 115;
    if (name.includes('00694B')) return 15.2;
    if (name.includes('2330')) return 1085;

    // US ETFs/Stocks
    if (name === 'VOO' || name.includes('VOO')) return 632.6;
    if (name === 'BND' || name.includes('BND')) return 74.3;
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

    return 1.0;
}

// Logic: Calculate Total Net Worth from Assets
export function calculateNetWorth(assets: Asset[], rates: ExchangeRates, stockPrices: Record<string, number> = {}): number {
    return assets.reduce((total, asset) => {
        const rate = getRate(asset.Currency, rates);
        const price = getLivePrice(asset.Name, asset.Currency, stockPrices);
        // Quantity * Price * Rate
        return total + (asset.Quantity * price * rate);
    }, 0);
}

export function calculateLiquidBreakdown(assets: Asset[], rates: ExchangeRates, stockPrices: Record<string, number> = {}) {
    let cash = 0;
    let stock = 0; // Stocks + ETF
    let crypto = 0;
    let other = 0;

    assets.forEach(asset => {
        const rate = getRate(asset.Currency, rates);
        const price = getLivePrice(asset.Name, asset.Currency, stockPrices);
        const value = asset.Quantity * price * rate;

        const cat = asset.Category || 'Other';
        const type = asset.Type || 'Asset';

        if (cat === 'Cash' || type === 'Fiat') {
            cash += value;
        } else if (cat === 'Stock' || cat === 'ETF' || type === 'Stock') {
            stock += value;
        } else if (cat === 'Crypto' || type === 'Crypto') {
            crypto += value;
        } else {
            other += value; // Alternates, etc.
        }
    });

    return {
        total: Math.round(cash + stock + crypto + other),
        cash: Math.round(cash),
        stock: Math.round(stock),
        crypto: Math.round(crypto),
        other: Math.round(other)
    };
}

// Logic: Generate Cash Flow Data (Monthly)
export function calculateCashFlow(
    recurringItems: RecurringItem[],
    currentTotalAssets: number = 0,
    insuranceDetails: Record<string, any[]> = {},
    rates: ExchangeRates,
    oneOffEvents: OneOffEvent[] = [],
    targetYear: number = 2026 // Default to 2026 as per user preference for now
) {
    // Generate Cash Flow for the specific Calendar Year (Jan - Dec)
    const data = [];
    let accumulatedNetWorth = currentTotalAssets;

    const getInsuranceValue = (id: string, date: Date) => {
        const details = insuranceDetails[id];
        if (!details || details.length === 0) return 0;
        const sorted = [...details].sort((a, b) => new Date(a.End_Date).getTime() - new Date(b.End_Date).getTime());
        let lastValue = 0;
        for (const d of sorted) {
            if (new Date(d.End_Date) <= date) lastValue = d.Cash_Value;
            else break;
        }
        return lastValue;
    };

    const insuranceAssetValues: Record<string, number> = {};
    const relevantInsuranceIds = ['R09', 'R10'];

    // For initial insurance value, use the start of the target year
    relevantInsuranceIds.forEach(id => {
        insuranceAssetValues[id] = getInsuranceValue(id, new Date(targetYear, 0, 1));
    });

    // Iterate Jan (0) to Dec (11) of the target year
    for (let month = 0; month < 12; month++) {
        const d = new Date(targetYear, month, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const monthIndex = d.getMonth() + 1;

        let income = 0;
        let expense = 0;
        let savings = 0;
        const incomeItems: { name: string; amount: number; id: number; isConverted?: boolean }[] = [];
        const expenseItems: { name: string; amount: number; id: number; isConverted?: boolean }[] = [];
        const savingsItems: { name: string; amount: number; id: number; isConverted?: boolean }[] = [];
        let insuranceValueGain = 0;

        recurringItems.forEach(item => {
            const itemStart = item.Start_Date ? new Date(item.Start_Date) : null;
            const itemEnd = item.End_Date ? new Date(item.End_Date) : null;

            if (itemStart) {
                const itemStartMonth = new Date(itemStart.getFullYear(), itemStart.getMonth(), 1);
                if (d < itemStartMonth) return;
            }
            if (itemEnd) {
                const itemEndMonth = new Date(itemEnd.getFullYear(), itemEnd.getMonth() + 1, 0);
                if (d > itemEndMonth) return;
            }

            let applies = false;
            let freq = 12;
            const freqStr = String(item.Frequency || '').trim();
            const specMonthStr = String(item.Specific_Month || '').trim();

            if (specMonthStr.includes(';') || freqStr.includes(';')) {
                const sourceStr = specMonthStr.includes(';') ? specMonthStr : freqStr;
                const targetMonths = sourceStr.split(';').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                if (targetMonths.includes(monthIndex)) applies = true;
            }
            else {
                const rawFreq = freqStr.toLowerCase();
                if (rawFreq === 'year' || rawFreq === 'yearly' || rawFreq === '1') freq = 1;
                else if (rawFreq === 'month' || rawFreq === 'monthly' || rawFreq === '12') freq = 12;
                else if (rawFreq === 'quarter' || rawFreq === 'quarterly' || rawFreq === '4') freq = 4;
                else if (rawFreq === 'week' || rawFreq === 'weekly' || rawFreq === '52') freq = 52;
                else {
                    const parsed = parseInt(freqStr);
                    if (!isNaN(parsed)) freq = parsed;
                }

                if (freq === 12) applies = true;
                else if (freq === 4) { if ((monthIndex - 1) % 3 === 0) applies = true; }
                else if (freq === 1) {
                    let targetMonth = 1;
                    if (specMonthStr && !isNaN(parseInt(specMonthStr))) targetMonth = parseInt(specMonthStr);
                    if (monthIndex === targetMonth) applies = true;
                }
            }

            if (applies) {
                const rate = getRate(item.Currency, rates);
                const isConverted = rate !== 1;
                const amount = (item.Amount_Base || 0) * rate;
                // Parse ID number for sorting
                const idNum = Number(item.ID.replace(/\D/g, '')) || 0;

                if (item.Type === 'Income') {
                    income += amount;
                    incomeItems.push({ name: item.Name, amount: Math.round(amount), id: idNum, isConverted });
                } else {
                    const cleanID = item.ID.trim();
                    const isSpecialInsurance = relevantInsuranceIds.includes(cleanID);
                    const cat = item.Category || '';
                    const isSaving = cat === 'Savings' || cat === 'Invest' || cat === 'Startups' || item.Name.includes('儲蓄') || item.Name.includes('存錢');

                    if (isSpecialInsurance) {
                        const details = insuranceDetails[cleanID] || [];
                        let savingsPart = 0;
                        let expensePart = amount; // Default
                        let winPart = 0;
                        const currentYearRecord = details.find(det => new Date(det.Date).getFullYear() === d.getFullYear());

                        if (currentYearRecord) {
                            if (cleanID === 'R09') { // Global Life
                                const rawSav = currentYearRecord.Calculation_SAV || 0;
                                const rawExp = currentYearRecord.Calculation_EXP || 0;
                                const rawWin = currentYearRecord.Calculation_WIN || 0;
                                savingsPart = rawSav * rate;
                                expensePart = rawExp * rate;
                                winPart = rawWin * rate;
                                savingsPart += winPart;
                            }
                            else if (cleanID === 'R10') { // Chubb Life
                                const costRaw = currentYearRecord.Cost || 0;
                                const cost = costRaw * rate;
                                expensePart = cost;
                                savingsPart = amount - cost;
                            }
                        }

                        if (expensePart < 0) expensePart = 0;
                        if (savingsPart < 0) savingsPart = 0;
                        if (cleanID === 'R10' && savingsPart > amount) savingsPart = amount;

                        if (savingsPart > 0) {
                            savings += savingsPart;
                            if (cleanID === 'R09' && winPart > 0) {
                                const baseSav = savingsPart - winPart;
                                if (baseSav > 0) {
                                    savingsItems.push({ name: `${item.Name} (CV/Inv)`, amount: Math.round(baseSav), id: idNum, isConverted });
                                }
                                savingsItems.push({ name: `${item.Name} (Win)`, amount: Math.round(winPart), id: idNum, isConverted });
                            } else {
                                savingsItems.push({ name: `${item.Name} (CV/Inv)`, amount: Math.round(savingsPart), id: idNum, isConverted });
                            }
                        }
                        if (expensePart > 0) {
                            expense += expensePart;
                            expenseItems.push({ name: `${item.Name} (Cost)`, amount: Math.round(expensePart), id: idNum, isConverted });
                        }
                        if (winPart > 0) insuranceValueGain += winPart;

                    } else {
                        if (isSaving) {
                            savings += amount;
                            savingsItems.push({ name: item.Name, amount: Math.round(amount), id: idNum, isConverted });
                        } else {
                            expense += amount;
                            expenseItems.push({ name: item.Name, amount: Math.round(amount), id: idNum, isConverted });
                        }
                    }
                }
            }
        });

        // --- Process One-Off Events ---
        // --- Process One-Off Events ---
        oneOffEvents.forEach(event => {
            // Robust Date Parsing (Handle YYYY-MM-DD or YYYY/MM/DD)
            // This avoids Timezone shifting issues with new Date()
            const dateStr = String(event.Date || '').trim();
            let eventYear = 0;
            let eventMonth = 0; // 1-based

            if (dateStr.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
                const parts = dateStr.split(/[-/]/);
                eventYear = parseInt(parts[0]);
                eventMonth = parseInt(parts[1]);
            } else {
                // Fallback to Date object
                const dobj = new Date(event.Date);
                if (!isNaN(dobj.getTime())) {
                    eventYear = dobj.getFullYear();
                    eventMonth = dobj.getMonth() + 1;
                }
            }

            // Check if matches current loop (d is 1st of month)
            // d.getMonth() is 0-based. eventMonth is 1-based.
            if (eventYear === d.getFullYear() && eventMonth === (d.getMonth() + 1)) {
                const amount = event.Amount || 0;
                // Note: We deliberately include Amount=0 if needed, but usually 0 is skipped.
                // If user says "missing", maybe checking Amount is too strict? 
                // Let's keep strict check only if 0 implies no-op.
                if (amount === 0) return;

                const name = `${event.Name} (Event)`;
                const isHouse = event.Category === 'House';

                if (event.Type === 'Income') {
                    income += amount;
                    incomeItems.push({ name, amount: Math.round(amount), id: 9999 + data.length, isConverted: false });
                } else {
                    if (isHouse) {
                        // House Expense -> Treats as Savings (Asset Accumulation)
                        savings += amount;
                        savingsItems.push({ name: `${name} (Equity)`, amount: Math.round(amount), id: 9999 + data.length, isConverted: false });
                    } else {
                        expense += amount;
                        expenseItems.push({ name, amount: Math.round(amount), id: 9999 + data.length, isConverted: false });
                    }
                }
            }
        });

        const monthlyNetChange = Math.round(income - expense - (savings - insuranceValueGain));
        accumulatedNetWorth += Math.round(monthlyNetChange + savings);

        data.push({
            monthLabel,
            income: Math.round(income),
            expense: Math.round(expense),
            savings: Math.round(savings),
            net: monthlyNetChange,
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

export function calculateAllocation(assets: Asset[], rates: ExchangeRates, stockPrices: Record<string, number> = {}) {
    const allocation: Record<string, number> = {};
    const details: Record<string, { name: string; value: number; id: string; isConverted?: boolean }[]> = {};

    assets.forEach((asset, index) => {
        const rate = getRate(asset.Currency, rates);
        const isConverted = rate !== 1;
        // Use live price
        const price = getLivePrice(asset.Name, asset.Currency, stockPrices);
        const value = Math.round(asset.Quantity * price * rate);

        const rawCategory = asset.Category || 'Other';
        const category = CATEGORY_MAPPING[rawCategory] || rawCategory;

        allocation[category] = (allocation[category] || 0) + value;

        if (!details[category]) details[category] = [];
        details[category].push({
            name: asset.Name,
            value,
            id: asset.ID ? String(asset.ID) : String(index),
            isConverted
        });
    });

    const PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#EC4899'];

    return Object.entries(allocation).map(([name, value], index) => {
        const sortedDetails = (details[name] || []).sort((a, b) => {
            const numA = parseInt(a.id);
            const numB = parseInt(b.id);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
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

export function checkLiquidity(assets: Asset[], recurringItems: RecurringItem[], oneOffs: OneOffEvent[], rates: ExchangeRates, stockPrices: Record<string, number> = {}) {

    const liquidCash = assets
        .filter(a => a.Category === 'Cash' || a.Type === 'Fiat')
        .reduce((sum, a) => {
            const rate = getRate(a.Currency, rates);
            const price = getLivePrice(a.Name, a.Currency, stockPrices);
            return sum + (a.Quantity * price * rate);
        }, 0);

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
