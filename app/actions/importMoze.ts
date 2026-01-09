'use server';

import { createHash } from 'crypto';
import { fetchLatestMozeCsv } from '@/lib/googleDrive';
import {
    updateRawTransactions,
    fetchAllRawTransactions,
    overwriteExpenseHistory,
    fetchRecurringItems,
    fetchOneOffEvents
} from '@/lib/googleSheets';
import { RawTransaction, ExpenseHistoryItem } from '@/lib/types';
import { parse } from 'csv-parse/sync';
import { revalidatePath } from 'next/cache';

// Helper: Generate Deterministic ID
function generateTransactionId(tx: any): string {
    const rawString = `${tx['日期']}|${tx['時間']}|${tx['名稱']}|${tx['金額']}|${tx['幣種']}|${tx['主類別']}|${tx['子類別']}|${tx['餘額']}`;
    return createHash('md5').update(rawString).digest('hex').substring(0, 12);
}

function parseDateToYearMonth(dateStr: string): string {
    const date = new Date(dateStr.replace(/\//g, '-'));
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

export async function syncMozeCsvFromDrive() {
    try {
        console.log('Starting Sync Process...');

        // 1. Fetch CSV
        const csvContent = await fetchLatestMozeCsv();
        if (!csvContent) {
            return { success: false, message: 'No MOZE CSV found in Drive.' };
        }

        // 2. Parse CSV
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            bom: true
        });
        console.log(`Parsed ${records.length} rows from CSV.`);

        // 2.5 Fetch Existing Data to Preserve Manual Actions
        const existingRows = await fetchAllRawTransactions();
        const manualActionMap = new Map<string, string>();
        existingRows.forEach(row => {
            if (row.ID && row.Manual_Action) {
                manualActionMap.set(row.ID, row.Manual_Action);
            }
        });
        console.log(`Loaded ${manualActionMap.size} manual actions from existing data.`);

        // 3. Map Data & Generate Deterministic IDs
        const mappedRows: RawTransaction[] = records.map((record: any) => {
            const dateStr = record['日期'] || '';
            const yearMonth = parseDateToYearMonth(dateStr);
            const id = generateTransactionId(record);
            const parseNum = (val: string) => parseFloat(val?.replace(/,/g, '')) || 0;
            const preservedAction = manualActionMap.get(id) || '';

            return {
                ID: id,
                YearMonth: yearMonth,
                MOZE_Source_Account: record['帳戶'] || '',
                MOZE_Currency: record['幣種'] || 'TWD',
                MOZE_Type: record['記錄類型'] || 'Expense',
                MOZE_Category: record['主類別'] || '',
                MOZE_SubCategory: record['子類別'] || '',
                MOZE_Amount: parseNum(record['金額']),
                MOZE_Fee: parseNum(record['手續費']),
                MOZE_Discount: parseNum(record['折扣']),
                MOZE_Name: record['名稱'] || '',
                MOZE_Merchant: record['商家'] || '',
                MOZE_Date: record['日期'] || '',
                MOZE_Time: record['時間'] || '',
                MOZE_Project: record['專案'] || '',
                MOZE_Description: record['描述'] || '',
                MOZE_Tag: record['標籤'] || '',
                MOZE_Who: record['對象'] || '',
                MOZE_Match_Status: '',
                Manual_Action: preservedAction,
                Action_Options: '結案 / 無視 / 當作支出 / 排除',
                Action_Desc: '結案:確認盈虧 | 無視:不處理 | 支出:強制計費 | 排除:剔除此筆'
            };
        });

        // Identify new YearMonths to clear old data
        const newYearMonths = Array.from(new Set(mappedRows.map(r => r.YearMonth))).filter(Boolean);
        console.log('Updating YearMonths:', newYearMonths);

        // 4. Pre-fetch Dependencies & Classify
        console.log('Fetching dependencies and classifying...');
        const [recurringItems, oneOffEvents] = await Promise.all([
            fetchRecurringItems(),
            fetchOneOffEvents()
        ]);

        const recurringMap = new Map(recurringItems.map(item => [item.ID, item]));
        const globalTravelEvents = oneOffEvents.filter(e => e.Category === 'GlobalTravel');

        type ClassifiedTx = RawTransaction & {
            _classification?: {
                id: string;
                name: string;
                note: string;
                matchType: string;
            }
        };

        const classifiedRows: ClassifiedTx[] = mappedRows.map(tx => {
            let matchStatus = '';
            let targetId = '';
            let targetName = '';
            let matchType = '';
            let debugNote = '';

            const tag = tx.MOZE_Tag || '';
            const project = tx.MOZE_Project || '';

            // --- Rule 2: Tag Mapping (#Rxx) ---
            const tagMatch = tag.match(/#R(\d+)/i);
            if (tagMatch) {
                const rid = `R${tagMatch[1]}`;
                const rItem = recurringMap.get(rid);
                if (rItem) {
                    targetId = rid;
                    targetName = rItem.Name;
                    matchType = 'TAG';
                }
            }

            // --- Rule 1: Project Mapping ---
            if (!matchType) {
                const p = project.toLowerCase();
                if (p.includes('shopping') || p.includes('購物')) {
                    targetId = 'R37'; targetName = recurringMap.get('R37')?.Name || 'Shopping'; matchType = 'PROJECT_BUDGET';
                } else if (p.includes('food') || p.includes('吃喝')) {
                    targetId = 'R35'; targetName = recurringMap.get('R35')?.Name || 'Food'; matchType = 'PROJECT_BUDGET';
                } else if (p.includes('transport') || p.includes('交通')) {
                    targetId = 'R36'; targetName = recurringMap.get('R36')?.Name || 'Transport'; matchType = 'PROJECT_BUDGET';
                } else if (p.includes('entertainment') || p.includes('娛樂')) {
                    targetId = 'R38'; targetName = recurringMap.get('R38')?.Name || 'Entertainment'; matchType = 'PROJECT_BUDGET';
                }

                // GlobalTravel
                if (!matchType) {
                    const eventMatch = globalTravelEvents.find(e => project.includes(e.Name) || e.Name.includes(project));
                    if (eventMatch && project.trim() !== '') {
                        targetId = eventMatch.ID;
                        targetName = eventMatch.Name;
                        matchType = 'PROJECT_EVENT';
                    }
                }
            }

            // --- Advanced Type Logic ---
            const isTransfer = (tx.MOZE_Type === '轉帳' || tx.MOZE_Type === 'Transfer' || tx.MOZE_Category === '轉帳' || (tx.MOZE_Category && tx.MOZE_Category.includes('信用卡')));
            const isPayable = (tx.MOZE_Type === '應付款項' || tx.MOZE_Type === 'Payable');
            const isReceivable = (tx.MOZE_Type === '應收款項' || tx.MOZE_Type === 'Receivable');
            const isRefund = (tx.MOZE_Type === '退款' || tx.MOZE_Type === 'Refund');
            const isIncome = (tx.MOZE_Type === '收入' || tx.MOZE_Type === 'Income');

            const isTechFee = (tx.MOZE_SubCategory && tx.MOZE_SubCategory.includes('技師牌費')) || (tx.MOZE_Name && tx.MOZE_Name.includes('技師牌費'));

            // 1. Tech Fee Logic (Top Priority - handles Income/Payable/Etc)
            if (isTechFee && !matchType) {
                const month = parseInt(tx.MOZE_Date.split('/')[1] || '0', 10);
                const amount = tx.MOZE_Amount;
                // Rule: July & Large Amount = Actual Income. Others = Amortized/Ignored.
                if (month === 7 && amount >= 400000) {
                    matchType = 'TECH_FEE_INCOME';
                    targetName = 'Technician Fee Income';
                    matchStatus = 'Tech Fee (Income)';
                } else {
                    matchType = 'IGNORE_TECH_FEE';
                    matchStatus = 'Tech Fee (Amortized) - Ignored';
                }
            }
            // 2. Transfer Logic
            else if (isTransfer && !matchType) {
                matchStatus = 'Transfer - Ignored';
                matchType = 'IGNORE_TRANSFER';
            }
            // 3. Receivable Logic
            else if ((isReceivable || isRefund) && !matchType) {
                if (tx.MOZE_Who) {
                    matchType = 'RECEIVABLE_PENDING';
                    matchStatus = 'Receivable: Check Status (Actions: 結案, 無視, 當作支出)';
                }
            }
            // 4. Unmatched Income Logic (Handle here for correct Raw Tx Status)
            else if (isIncome && !matchType) {
                const subCat = tx.MOZE_SubCategory || 'Other';
                matchType = 'UNMATCHED_INCOME';
                targetName = `非固定收入/${subCat}`;
                matchStatus = `Income: ${subCat}`;
                targetId = `INC_${subCat}`; // Generate pseudo ID
            }

            // --- Rule 3: Fallback ---
            if (!matchType) {
                targetId = '';
                targetName = 'Waiting_Rules';
                matchType = 'UNMATCHED';
                matchStatus = 'Waiting_Rules';
                debugNote = `[${tx.MOZE_Name}] Proj:${project}`;
            } else if (matchType === 'RECEIVABLE_PENDING') {
                // Keep status
            } else if (!matchStatus) {
                matchStatus = `Matched: ${targetId}`;
                debugNote = matchType === 'TAG' ? `Matched Tag: ${tag}` : `Matched Project: ${project}`;
            }

            return {
                ...tx,
                MOZE_Match_Status: matchStatus,
                _classification: {
                    id: targetId,
                    name: targetName,
                    note: debugNote,
                    matchType: matchType
                }
            };
        });

        // 5a. Infer Project for Untagged Exchanges
        const projectCurrencyMap = new Map<string, Set<string>>();
        const currencyToProjectMap = new Map<string, Set<string>>();

        classifiedRows.forEach(tx => {
            if (tx.MOZE_Project && tx.MOZE_Currency !== 'TWD') {
                const matchType = tx._classification?.matchType;
                // Allow infer even if unmatched or income? Usually just Project Budget items
                if (matchType && matchType !== 'UNMATCHED') {
                    const p = tx.MOZE_Project;
                    const c = tx.MOZE_Currency;
                    if (!projectCurrencyMap.has(p)) projectCurrencyMap.set(p, new Set());
                    projectCurrencyMap.get(p)!.add(c);
                    if (!currencyToProjectMap.has(c)) currencyToProjectMap.set(c, new Set());
                    currencyToProjectMap.get(c)!.add(p);
                }
            }
        });

        // Robust Exchange Grouping: Any Transfer Pair (TWD + FX) is an Exchange
        const exchangeGroups = new Map<string, ClassifiedTx[]>();
        classifiedRows.forEach(tx => {
            const isTransfer = (tx.MOZE_Type === '轉帳' || tx.MOZE_Type === 'Transfer' || tx.MOZE_Category === '轉帳' || (tx.MOZE_Category && tx.MOZE_Category.includes('信用卡')));

            // Exclude '信用卡' from Exchange Grouping strictly
            // Use strict name check just in case Category matches but it's CC
            const isCC = (tx.MOZE_Category && tx.MOZE_Category.includes('信用卡'));

            if (isTransfer && !isCC) {
                const key = `${tx.MOZE_Date}|${tx.MOZE_Time}`;
                if (!exchangeGroups.has(key)) exchangeGroups.set(key, []);
                exchangeGroups.get(key)!.push(tx);
            }
        });

        // Filter valid exchange pairs & Infer Project
        exchangeGroups.forEach((group, key) => {
            const hasTwd = group.some(t => t.MOZE_Currency === 'TWD');
            const hasFx = group.some(t => t.MOZE_Currency !== 'TWD');

            if (!hasTwd || !hasFx || group.length !== 2) {
                exchangeGroups.delete(key);
                return;
            }

            // Inference
            const existingProject = group.find(t => t.MOZE_Project)?.MOZE_Project;
            if (existingProject) {
                group.forEach(t => {
                    t.MOZE_Project = existingProject;
                    t.MOZE_Match_Status = `Inferred: ${existingProject}`;
                    // Mark as Exchange to avoid aggregation duplicate
                    if (t._classification) t._classification.matchType = 'INFERRED_EXCHANGE';
                });
                return;
            }

            const fxTx = group.find(t => t.MOZE_Currency !== 'TWD');
            if (fxTx) {
                const c = fxTx.MOZE_Currency;
                const potentialProjects = currencyToProjectMap.get(c);
                if (potentialProjects && potentialProjects.size === 1) {
                    const inferredProject = Array.from(potentialProjects)[0];
                    group.forEach(t => {
                        t.MOZE_Project = inferredProject;
                        t.MOZE_Match_Status = `Inferred: ${inferredProject}`;
                        if (t._classification) t._classification.matchType = 'INFERRED_EXCHANGE';
                        else t._classification = { id: '', name: '', note: '', matchType: 'INFERRED_EXCHANGE' };
                    });
                }
            }
        });

        // 6. Calculate Project Rates & Global Rates & Monthly Rates
        const projectFxSums = new Map<string, Map<string, { sumTwd: number, sumFx: number }>>();
        const globalFxSums = new Map<string, { sumTwd: number, sumFx: number }>();
        const monthlyFxSums = new Map<string, Map<string, { sumTwd: number, sumFx: number }>>();

        exchangeGroups.forEach((group) => {
            const twdOut = group.find(t => t.MOZE_Currency === 'TWD');
            const fxIn = group.find(t => t.MOZE_Currency !== 'TWD');

            if (twdOut && fxIn) {
                const currency = fxIn.MOZE_Currency;
                const yearMonth = fxIn.YearMonth;
                const twdVal = Math.abs(twdOut.MOZE_Amount + twdOut.MOZE_Fee - twdOut.MOZE_Discount);
                const fxVal = Math.abs(fxIn.MOZE_Amount + fxIn.MOZE_Fee - fxIn.MOZE_Discount);

                // Global
                if (!globalFxSums.has(currency)) globalFxSums.set(currency, { sumTwd: 0, sumFx: 0 });
                const gTotal = globalFxSums.get(currency)!;
                gTotal.sumTwd += twdVal;
                gTotal.sumFx += fxVal;

                // Monthly
                if (!monthlyFxSums.has(yearMonth)) monthlyFxSums.set(yearMonth, new Map());
                const mTotalMap = monthlyFxSums.get(yearMonth)!;
                if (!mTotalMap.has(currency)) mTotalMap.set(currency, { sumTwd: 0, sumFx: 0 });
                const mTotal = mTotalMap.get(currency)!;
                mTotal.sumTwd += twdVal;
                mTotal.sumFx += fxVal;

                // Project
                const project = group[0].MOZE_Project;
                if (project) {
                    if (!projectFxSums.has(project)) projectFxSums.set(project, new Map());
                    const curMap = projectFxSums.get(project)!;
                    if (!curMap.has(currency)) curMap.set(currency, { sumTwd: 0, sumFx: 0 });
                    const totals = curMap.get(currency)!;
                    totals.sumTwd += twdVal;
                    totals.sumFx += fxVal;
                }
            }
        });

        const projectRates = new Map<string, Map<string, number>>();
        projectFxSums.forEach((curMap, project) => {
            curMap.forEach((totals, currency) => {
                if (totals.sumFx > 0) {
                    const rate = totals.sumTwd / totals.sumFx;
                    if (!projectRates.has(project)) projectRates.set(project, new Map());
                    projectRates.get(project)!.set(currency, rate);
                }
            });
        });

        const globalRates = new Map<string, number>();
        globalFxSums.forEach((totals, currency) => {
            if (totals.sumFx > 0) {
                globalRates.set(currency, totals.sumTwd / totals.sumFx);
            }
        });

        const monthlyRates = new Map<string, Map<string, number>>();
        monthlyFxSums.forEach((curMap, ym) => {
            curMap.forEach((totals, currency) => {
                if (totals.sumFx > 0) {
                    if (!monthlyRates.has(ym)) monthlyRates.set(ym, new Map());
                    monthlyRates.get(ym)!.set(currency, totals.sumTwd / totals.sumFx);
                }
            });
        });

        // 6.5 Receivables Logic (Netting)
        const receivableGroups = new Map<string, ClassifiedTx[]>();
        classifiedRows.forEach(tx => {
            if (tx._classification?.matchType === 'RECEIVABLE_PENDING') {
                const key = `${tx.MOZE_Who}|${tx.MOZE_Name.trim().toLowerCase()}`;
                if (!receivableGroups.has(key)) receivableGroups.set(key, []);
                receivableGroups.get(key)!.push(tx);
            }
        });

        const syntheticReceivables: {
            yearMonth: string,
            id: string,
            name: string,
            amount: number,
            note: string
        }[] = [];

        receivableGroups.forEach((group) => {
            const who = group[0].MOZE_Who || 'Unknown';
            const rawName = group[0].MOZE_Name;

            let netAmount = 0;
            let manualAction = '';

            group.forEach(tx => {
                // Feature: Exclude specific legacy/noise transactions (e.g. 2025 payback)
                if (tx.Manual_Action === '排除') {
                    return;
                }

                let amount = tx.MOZE_Amount;
                // Natural Sum: 
                // Receivable (-71,403) + Fee (-30) = -71,433.
                // Refund (+235,000) -> Converted.
                // Repayment (+50,000).

                if (tx.MOZE_Currency !== 'TWD') {
                    // Fallsback: Project -> Monthly -> Global
                    let pRate = projectRates.get(tx.MOZE_Project)?.get(tx.MOZE_Currency);
                    if (!pRate) pRate = monthlyRates.get(tx.YearMonth)?.get(tx.MOZE_Currency);
                    if (!pRate) pRate = globalRates.get(tx.MOZE_Currency);

                    if (pRate) {
                        amount = amount * pRate;
                    }
                }
                netAmount += amount;
                if (tx.Manual_Action) manualAction = tx.Manual_Action;
            });

            group.sort((a, b) => b.MOZE_Date.localeCompare(a.MOZE_Date));
            const latestYM = group[0].YearMonth;

            // Updated Signs for Synthetic: 
            // Profit -> Income (Positive)
            // Loss -> Expense (Negative)
            // Manual Expense -> Negative

            const groupStatus = manualAction === '當作支出' ? `Netted: Manual Expense`
                : manualAction === '無視' ? `Netted: Ignored`
                    : manualAction === '結案' ? (netAmount > 0 ? `Netted: Profit` : `Netted: Closed (Loss)`)
                        : netAmount > 0 ? `Netted: Profit`
                            : `Receivable: Pending (Net: ${Math.round(netAmount)})`;

            group.forEach(tx => {
                tx.MOZE_Match_Status = groupStatus;
            });

            if (manualAction === '當作支出') {
                syntheticReceivables.push({
                    yearMonth: latestYM,
                    id: 'R_MANUAL_EXP',
                    name: `${who}代墊轉支出`,
                    amount: -Math.abs(netAmount), // Always Negative
                    note: `Manual: 當作支出 [${rawName}]`
                });
            } else if (manualAction === '無視') {
                // Ignore
            } else if (netAmount > 0) {
                // Profit -> Income -> Positive
                syntheticReceivables.push({
                    yearMonth: latestYM,
                    id: 'R_REC_PROFIT',
                    name: `差額收入/${who}`,
                    amount: Math.abs(netAmount), // Positive
                    note: `Profit from ${rawName}`
                });
            } else if (netAmount < 0 && manualAction === '結案') {
                // Loss -> Expense -> Negative
                syntheticReceivables.push({
                    yearMonth: latestYM,
                    id: 'R_REC_LOSS',
                    name: `差額支出/${who}`,
                    amount: -Math.abs(netAmount), // Negative
                    note: `Loss closed: ${rawName}`
                });
            }
        });

        // 7. Update Raw Transactions (Status updated)
        await updateRawTransactions(classifiedRows, newYearMonths);

        // 8. Aggregate Stats
        console.log('Aggregating Expense History...');
        const aggregationMap = new Map<string, {
            yearMonth: string,
            id: string,
            name: string,
            amount: number,
            notes: Set<string>
        }>();

        classifiedRows.forEach(tx => {
            if (!tx._classification) return;
            const cls = tx._classification;

            if (cls.matchType === 'IGNORE_TRANSFER' ||
                cls.matchType === 'IGNORE_TECH_FEE' ||
                cls.matchType === 'RECEIVABLE_PENDING' ||
                cls.matchType === 'INFERRED_EXCHANGE' || // Ensure detected exchanges are skipped
                tx.MOZE_SubCategory === '兌換'
            ) {
                return;
            }

            if (cls.matchType === 'TECH_FEE_INCOME') {
                // Income -> Positive
                const finalAmt = Math.abs(tx.MOZE_Amount);
                const aggKey = `${tx.YearMonth}|${cls.id}|${cls.name}`;
                if (!aggregationMap.has(aggKey)) aggregationMap.set(aggKey, { yearMonth: tx.YearMonth, id: cls.id, name: cls.name, amount: 0, notes: new Set() });
                aggregationMap.get(aggKey)!.amount += finalAmt;
                return;
            }

            // Natural Sum Logic
            let baseAmount = tx.MOZE_Amount + tx.MOZE_Fee + tx.MOZE_Discount;

            if (tx.MOZE_Currency !== 'TWD') {
                let pRate = projectRates.get(tx.MOZE_Project)?.get(tx.MOZE_Currency);
                if (!pRate) pRate = monthlyRates.get(tx.YearMonth)?.get(tx.MOZE_Currency);
                if (!pRate) pRate = globalRates.get(tx.MOZE_Currency);
                if (pRate) baseAmount = baseAmount * pRate;
            }

            // Aggregation Key Logic
            const aggKey = cls.matchType === 'UNMATCHED'
                ? `${tx.YearMonth}|UNMATCHED|${tx.MOZE_Name}`
                : `${tx.YearMonth}|${cls.id}|${cls.name}`;

            if (!aggregationMap.has(aggKey)) {
                // Extract Name from key or reconstruct
                const name = aggKey.split('|')[2];
                const id = aggKey.split('|')[1];
                aggregationMap.set(aggKey, {
                    yearMonth: tx.YearMonth,
                    id: id,
                    name: name,
                    amount: 0,
                    notes: new Set()
                });
            }
            aggregationMap.get(aggKey)!.amount += baseAmount;
            if (cls.note) aggregationMap.get(aggKey)!.notes.add(cls.note);
        });

        syntheticReceivables.forEach(syn => {
            const aggKey = `${syn.yearMonth}|${syn.id}|${syn.name}`;
            if (!aggregationMap.has(aggKey)) {
                aggregationMap.set(aggKey, {
                    yearMonth: syn.yearMonth,
                    id: syn.id,
                    name: syn.name,
                    amount: 0,
                    notes: new Set()
                });
            }
            aggregationMap.get(aggKey)!.amount += syn.amount;
            aggregationMap.get(aggKey)!.notes.add(syn.note);
        });

        const historyRows: ExpenseHistoryItem[] = Array.from(aggregationMap.values()).map(agg => {
            return {
                YearMonth: agg.yearMonth,
                Recurring_Item_ID: agg.id,
                Name_Category: agg.name,
                Actual_Amount: agg.amount,
                Note: Array.from(agg.notes).join('; ').substring(0, 500)
            };
        });

        historyRows.sort((a, b) => {
            const ym = b.YearMonth.localeCompare(a.YearMonth);
            if (ym !== 0) return ym;
            return a.Recurring_Item_ID.localeCompare(b.Recurring_Item_ID || 'ZZZ');
        });

        await overwriteExpenseHistory(historyRows);

        revalidatePath('/');
        console.log('Sync Complete.');
        return { success: true, message: `Synced ${mappedRows.length} tx. History: ${historyRows.length} items.` };

    } catch (error: any) {
        console.error('Sync Failed:', error);
        return { success: false, message: `Sync failed: ${error.message || String(error)}` };
    }
}
