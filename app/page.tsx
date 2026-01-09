import { Bell, Settings, RefreshCw, AlertCircle, CheckCircle, Smartphone, PieChart as PieChartIcon, Home as HomeIcon, FileText } from 'lucide-react';

import FixedAssetCard from '@/components/dashboard/FixedAssetCard';
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import AssetAllocation from '@/components/dashboard/AssetAllocation';
import TimelineAlert from '@/components/dashboard/TimelineAlert';
import LiquidityWidget from '@/components/dashboard/LiquidityWidget';
import AssetTable from '@/components/dashboard/AssetTable';
import RecurringTable from '@/components/dashboard/RecurringTable';
import CashHoldings from '@/components/dashboard/CashHoldings';
import ExpenseBreakdown from '@/components/dashboard/ExpenseBreakdown';
import AssetTreemap from '@/components/dashboard/AssetTreemap';
import DebtDashboard from '@/components/dashboard/DebtDashboard';
import DashboardHeaderActions from '@/components/dashboard/DashboardHeaderActions';
import { BudgetTracker } from '@/components/dashboard/BudgetTracker';

import {
  calculateNetWorth,
  calculateCashFlow,
  calculateAllocation,
  checkLiquidity,
  calculateFixedAssets,
  calculateLiquidBreakdown
} from '@/lib/financial-logic';
import {
  fetchAssets,
  fetchRecurringItems,
  fetchOneOffEvents,
  fetchCategoryMap,
  fetchDebtDetails,
  fetchInsuranceDetails,
  fetchExpenseHistory
} from '@/lib/googleSheets';
import { ExchangeRates } from '@/lib/currency'; // Only Import Type
import { fetchStockPrices, StockData } from '@/lib/stocks';
import { Asset, RecurringItem, OneOffEvent, DebtDetail, InsuranceDetail, ExpenseHistoryItem } from '@/lib/types';
import { CATEGORY_MAPPING as DEFAULT_MAPPING } from '@/lib/financial-logic';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Fetch Data (Server Side) with Error Handling
  let assets: Asset[] = [];
  let recurringItems: RecurringItem[] = [];
  let oneOffEvents: OneOffEvent[] = [];
  let dynamicMap: Record<string, string> = {};

  // New Data
  let debtR33: DebtDetail[] = [];
  let debtR34: DebtDetail[] = []; // House Loan
  let insR09: InsuranceDetail[] = [];
  let insR10: InsuranceDetail[] = [];
  let expenseHistory: ExpenseHistoryItem[] = [];

  // Currency State
  let exchangeData = {
    rates: { USD: 32.5, JPY: 0.22, TWD: 1 } as ExchangeRates,
    isLive: false
  };

  // Stock State
  let stockData: StockData = { prices: {}, status: 'OFFLINE' };

  try {
    // Parallel Fetching
    // Parallel Fetching
    const [fetchedAssets, fetchedRecurring, fetchedEvents, fetchedMap, fetchedR33, fetchedR34, fetchedR09, fetchedR10, fetchedHistory] = await Promise.all([
      fetchAssets(),
      fetchRecurringItems(),
      fetchOneOffEvents(),
      fetchCategoryMap(),
      fetchDebtDetails('R33_Debt_Table'),
      fetchDebtDetails('R34_Debt_Table'),
      fetchInsuranceDetails('R09_Ins_Table'),
      fetchInsuranceDetails('R10_Ins_Table'),
      fetchExpenseHistory()
    ]);

    assets = fetchedAssets;
    recurringItems = fetchedRecurring;
    oneOffEvents = fetchedEvents;
    dynamicMap = fetchedMap;
    debtR33 = fetchedR33;
    debtR34 = fetchedR34;
    insR09 = fetchedR09;
    insR10 = fetchedR10;
    expenseHistory = fetchedHistory;

    // Logic: Derive Rates from Assets
    // Find Fiat/Cash assets with Currency USD/JPY and get their Unit_Price (which is Exchange Rate to TWD)
    // Default fallback
    const derivedRates: ExchangeRates = { USD: 32.5, JPY: 0.22, TWD: 1 };

    // Find USD Rate (e.g. from "永豐外幣帳戶(USD)" or similar)
    const usdAsset = assets.find(a => (a.Category === 'Cash' || a.Type === 'Fiat') && a.Currency === 'USD' && a.Unit_Price && a.Unit_Price > 0);
    if (usdAsset && usdAsset.Unit_Price) {
      derivedRates.USD = usdAsset.Unit_Price;
    }

    // Find JPY Rate
    const jpyAsset = assets.find(a => (a.Category === 'Cash' || a.Type === 'Fiat') && a.Currency === 'JPY' && a.Unit_Price && a.Unit_Price > 0);
    if (jpyAsset && jpyAsset.Unit_Price) {
      derivedRates.JPY = jpyAsset.Unit_Price;
    }

    exchangeData = {
      rates: derivedRates,
      isLive: true // Considered Live as it comes from the sheet
    };

    // Phase 2: Fetch Stocks (Depends on Assets)
    if (assets.length > 0) {
      stockData = await fetchStockPrices(assets);
    }

  } catch (error) {
    console.error("Critical Data Fetch Error:", error);
  }

  // Merge Dynamic Map with Default
  const categoryMap = { ...DEFAULT_MAPPING, ...dynamicMap };

  // 2. Logic / Calculations
  const { rates, isLive } = exchangeData;
  const { prices: stockPrices, status: stockStatus, error: stockError } = stockData;

  // Prepare Maps
  const debtDetailsMap: Record<string, DebtDetail[]> = {
    'R33': debtR33,
    'R34': debtR34  // Map ID 'R34' to the data fetched from 'R34_Debt_Table'
  };
  const insuranceDetailsMap: Record<string, InsuranceDetail[]> = {
    'R09': insR09, // Map ID 'R09' to the data fetched from 'R09_Ins_Table'
    'R10': insR10
  };

  // 3. Financial Calculations
  const liquidBreakdown = calculateLiquidBreakdown(assets, rates, stockPrices); // New Breakdown
  const liquidNetWorth = liquidBreakdown.total;
  const fixedAssets = calculateFixedAssets(oneOffEvents, insuranceDetailsMap, rates); // Fixed Assets

  // 3.1 Calculate Liability (R33)
  const today = new Date();
  const sortedDebt = [...debtR33].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
  const currentDebtEntry = sortedDebt.filter(d => new Date(d.Date) <= today).pop() || sortedDebt[0]; // Last entry on or before today
  const totalLiability = currentDebtEntry?.Balance || 0;

  // Net Worth = Assets - Liabilities
  const totalNetWorth = liquidNetWorth + fixedAssets.total - totalLiability;

  // 2026 Calendar Year View
  const targetYear = 2026;
  const cashFlowData = calculateCashFlow(
    recurringItems,
    totalNetWorth, // Correctly passing the debt-adjusted Net Worth
    insuranceDetailsMap,
    rates,
    oneOffEvents,
    targetYear
  );

  // --- Fixed Asset Enrichment Logic ---

  // 1. House Logic
  const houseAsset = assets.find(a => a.Category === 'Real Estate' || a.Type === 'Real Estate');
  const houseName = houseAsset ? houseAsset.Name : '自有住宅';

  // Calculate House Total Price
  // Sum of linked OneOffEvents (Down Pay etc) + Linked Debt Original Loan
  // Note: fixedAssets.house = Sum of OneOffEvents (Equity Paid so far)
  // Total Price = Equity Paid + Loan Balance? No.
  // User says: "Total = Down Payments + Engineering etc + Total Loan"
  // Actually, fixedAssets.house comes from ONE_OFF_EVENTS filter Category='House'.
  // If the user entered Down Payments as "House" events, then fixedAssets.house IS the sum of down payments.
  // So Total Price = fixedAssets.house + Debt.Total_Loan.

  let houseTotalValParam = 0;
  let houseOwnershipPercent = 0;

  if (houseAsset && houseAsset.Real_Estate_Connect) {
    const links = houseAsset.Real_Estate_Connect.split(',').map(s => s.trim());

    // Find Linked Debt (R34)
    const linkedDebtID = links.find(l => l.startsWith('R'));
    let debtLoanAmount = 0;

    // Look up in debt map using key 'R34' (assuming ID is R34 in sheet)
    // If we looked up 'R34', we must ensure the key in map is 'R34'.
    // We populated the map with 'R34': debtR34.
    if (linkedDebtID && debtDetailsMap[linkedDebtID] && debtDetailsMap[linkedDebtID].length > 0) {
      debtLoanAmount = debtDetailsMap[linkedDebtID][0].Total_Loan;
    }

    // Total Price = Equity (Paid) + Loan (Debt) ?
    // User said: "Should be sum of down/engineering... then add loan total".
    // fixedAssets.house = Sum of OneOffEvents(House).
    // So:
    // Total Price = All Equity (Paid + Unpaid) + Loan (Debt)
    // User wants ALL linked events (Down payments, Engineering) included, regardless of date.
    const totalEquityCommitment = oneOffEvents
      .filter(e => links.includes(e.ID))
      .reduce((sum, e) => sum + e.Amount, 0);

    houseTotalValParam = totalEquityCommitment + debtLoanAmount;

    if (houseTotalValParam > 0) {
      // Ownership % based on Paid Equity vs Total Price
      // OR User might mean "How much of the house do I own?" -> (Paid Equity + Paid Principal) / Total?
      // Usually "Holding %" for pre-sale means "Equity Paid / Total Equity".
      // But dashboard shows "Paying...".
      // Let's keep Ownership = (fixedAssets.house / houseTotalValParam) for now (Paid / Total Price).
      houseOwnershipPercent = (fixedAssets.house / houseTotalValParam) * 100;
    }
  }
  // Fallback: if calculated is 0, maybe use fixedAssets.house? No, usually houseEquity is partial.
  // If we can't calculate, leave as 0 or undefined.

  // 2. Insurance Logic (Direct ID Match)
  const r09Item = recurringItems.find(i => i.ID === 'R09');
  const r10Item = recurringItems.find(i => i.ID === 'R10');

  const r09Start = insR09.length > 0 ? insR09[0].Date : 'N/A';
  const r10Start = insR10.length > 0 ? insR10[0].Date : 'N/A';

  // Calculate ROI & Cost (Native Currency)
  const calculateMetrics = (details: InsuranceDetail[]) => {
    if (!details || details.length === 0) return { roi: 0, cost: 0 };
    const today = new Date();

    // 1. Total Cost (Sum of Premiums paid to date)
    const paidDetails = details.filter(d => new Date(d.Date) <= today);
    const totalCost = paidDetails.reduce((sum, d) => sum + d.Premium, 0);

    // 2. Current Value (Latest Cash Value)
    const sorted = [...paidDetails].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    const currentEntry = sorted.pop();
    const currentVal = currentEntry ? currentEntry.Cash_Value : 0;

    const roi = totalCost === 0 ? 0 : ((currentVal - totalCost) / totalCost) * 100;
    return { roi, cost: totalCost };
  };

  const { roi: r09ROI, cost: r09Cost } = calculateMetrics(insR09);
  const { roi: r10ROI, cost: r10Cost } = calculateMetrics(insR10);

  const formatCurrency = (val: number, curr: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) =>
    `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  const getFrequencyLabel = (freq: string) => {
    if (freq === '1') return '年繳';
    if (freq === '2') return '半年繳';
    if (freq === '4') return '季繳';
    if (freq === '12') return '月繳';
    return '其他';
  };

  // Filter out Real Estate from Liquid Allocation
  const liquidAssetsForAllocation = assets.filter(a => a.Category !== 'Real Estate' && a.Type !== 'Real Estate');
  const allocationData = calculateAllocation(liquidAssetsForAllocation, rates, stockPrices);

  // ------------------------------------  // 2026 Calendar Year View
  const liquidityStatus = checkLiquidity(assets, recurringItems, oneOffEvents, rates, stockPrices);
  const { liquidCash } = liquidityStatus;

  // 3. Find Next Event
  const nextEvent = oneOffEvents
    .filter(e => new Date(e.Date) > new Date())
    .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())[0];

  // 4. Split Assets (Logic)
  const cashAssets = assets.filter(a => ['Cash', 'Fiat', 'Deposit'].includes(a.Category) || a.Type === 'Fiat');
  const investAssets = assets.filter(a => !['Cash', 'Fiat', 'Deposit'].includes(a.Category) && a.Type !== 'Fiat' && a.Category !== 'Real Estate' && a.Type !== 'Real Estate');

  // 5. Lookups per User Request
  const r33Name = recurringItems.find(i => i.ID === 'R33')?.Name;
  const r09Name = recurringItems.find(i => i.ID === 'R09')?.Name || 'R09 (Global)';
  const r10Name = recurringItems.find(i => i.ID === 'R10')?.Name || 'R10 (Chubb)';

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-12 font-[family-name:var(--font-geist-sans)] bg-slate-950">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Ben's Financial Cockpit</h1>
          <p className="text-slate-400 mt-2">歡迎回來，Ben</p>
        </div>
        <div className="flex gap-4 items-center">


          {/* Status Indicators */}
          <div className="flex items-center gap-3">
            {/* Currency Status */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${isLive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {isLive ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <div className="flex gap-3 text-xs font-mono font-medium">
                <span>USD: {rates.USD.toFixed(2)}</span>
                <span className="opacity-50">|</span>
                <span>JPY: {rates.JPY.toFixed(4)}</span>
              </div>
            </div>

            {/* Stock Status with Tooltip */}
            <div
              title={stockError || 'No status details available'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-help ${stockStatus === 'LIVE' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}
            >
              {stockStatus === 'LIVE' ? <Smartphone className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span className="text-xs font-mono font-medium">{stockStatus === 'LIVE' ? 'Stocks: Live' : 'Stocks: Offline'}</span>
            </div>
          </div>

          <DashboardHeaderActions assets={assets} rates={rates} stockPrices={stockPrices} />
        </div>
      </header>

      <main className="space-y-8">

        {/* 1. Top Section: Critical KPIs */}
        {/* Adjusted Grid: Custom fraction layout for perfect balance 2.6fr - 5fr - 4.4fr */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.6fr_5fr_4.4fr] gap-6 h-auto">
          <div className="lg:col-span-1">
            <NetWorthCard
              totalNetWorth={totalNetWorth}
              totalLiability={totalLiability}
              liabilityName={r33Name}
            />
          </div>
          <div className="lg:col-span-1">
            <LiquidityWidget
              liquidCash={liquidCash}
              status={liquidityStatus}
              event={nextEvent}
              breakdown={{
                liquid: liquidBreakdown,
                fixed: {
                  ...fixedAssets,
                  r09Name,
                  r10Name
                }
              }}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <TimelineAlert
              events={oneOffEvents.filter(e => new Date(e.Date) > new Date()).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())}
            />
          </div>
        </div>

        {/* 1.5 Budget Tracker (Moved below) */}


        {/* 2. Main Visuals: Cash Flow & Expense */}
        {/* Grid adjusted to 2:1 ratio (col-span-2 vs col-span-1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
          <div className="lg:col-span-2 rounded-[2rem] h-[400px]">
            {/* Passed data contains isConverted flags */}
            <CashFlowChart data={cashFlowData} />
          </div>
          <div className="lg:col-span-1 rounded-[2rem] h-[400px]">
            <ExpenseBreakdown items={recurringItems} categoryMap={categoryMap} />
          </div>
        </div>

        {/* 1.5 Budget Tracker (Yearly) */}
        <div className="w-full">
          <BudgetTracker budgets={recurringItems} actuals={expenseHistory} />
        </div>

        {/* 2.5 Debt Dashboard (New Section) */}
        {/* Only show if data exists */}
        {
          debtR33.length > 0 && (
            <div className="w-full">
              <DebtDashboard data={debtR33} r33Name={r33Name} />
            </div>
          )
        }

        {/* 3. Asset Allocation & Heatmap */}
        {/* 3. Liquid Assets Detail (Unified Row) */}
        {/* Layout: Allocation (Left) | Cash (Center) | Investments (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[340px]">
          {/* 3.1 Allocation Donut (3 cols) */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
            <AssetAllocation data={allocationData} />
          </div>

          {/* 3.2 Cash Holdings List (4 cols) */}
          <div className="lg:col-span-4 h-full min-h-0 overflow-hidden">
            <CashHoldings assets={cashAssets} />
          </div>

          {/* 3.3 Investment Table (5 cols) */}
          <div className="lg:col-span-5 h-full min-h-0 overflow-hidden">
            <AssetTable assets={investAssets} categoryMap={categoryMap} stockPrices={stockPrices} rates={rates as unknown as Record<string, number>} />
          </div>
        </div>

        {/* 4. Fixed Assets Section */}
        {/* Layout: Fixed Composition (3 cols) | House (3 cols) | R09 (3 cols) | R10 (3 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto min-h-[360px]">
          {/* 4.1 Fixed Composition Pie */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
            <AssetAllocation
              data={[
                { name: houseName, value: fixedAssets.house, color: "#8b5cf6" }, // Violet
                { name: r09Item?.Name || "R09", value: fixedAssets.r09, color: "#ec4899" },    // Pink
                { name: r10Item?.Name || "R10", value: fixedAssets.r10, color: "#f43f5e" }     // Rose
              ]}
              title="固定資產 (Fixed)"
              subTitle="固定資產組成"
              icon={<PieChartIcon className="h-4 w-4 text-purple-400" />}
            />
          </div>

          {/* 4.2 House */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
            <FixedAssetCard
              title="房地產 (Real Estate)"
              subTitle={houseName}
              value={fixedAssets.house} // Only Paid Equity
              icon={<HomeIcon className="w-5 h-5 text-purple-400" />}
              details={[
                { label: '簽約總價', value: houseTotalValParam > 0 ? formatCurrency(houseTotalValParam, 'TWD') : 'N/A' },
                { label: '已付權益', value: formatCurrency(fixedAssets.house, 'TWD') },
                { label: '持有比例', value: houseOwnershipPercent > 0 ? `${houseOwnershipPercent.toFixed(1)}%` : 'N/A' }
              ]}
            />
          </div>

          {/* 4.3 R09 */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
            {r09Item && (
              <FixedAssetCard
                title="保單資產 (Insurance)"
                subTitle={r09Item.Name}
                value={fixedAssets.r09}
                icon={<FileText className="w-5 h-5 text-pink-400" />}
                details={[
                  { label: '目前投報', value: `${r09ROI.toFixed(2)}%`, subText: '含匯差估算' },
                  { label: '繳費頻率', value: getFrequencyLabel(r09Item.Frequency) },
                  { label: '本期保費', value: `USD $${r09Item.Amount_Base.toLocaleString()}` },
                  { label: '合約起始', value: r09Start }
                ]}
                investedAmount={{
                  label: '已投入金額',
                  value: `USD ${formatCurrency(r09Cost, 'USD')}`
                }}
                isConverted={true}
              />
            )}
          </div>

          {/* 4.4 R10 */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
            {r10Item && (
              <FixedAssetCard
                title="保單資產 (Insurance)"
                subTitle={r10Item.Name}
                value={fixedAssets.r10}
                currency="TWD"
                icon={<FileText className="w-5 h-5 text-purple-400" />}
                details={[
                  { label: '目前投報', value: `${r10ROI.toFixed(2)}%` },
                  { label: '繳費頻率', value: getFrequencyLabel(r10Item.Frequency) },
                  { label: '本期保費', value: `NT$${r10Item.Amount_Base.toLocaleString()}` },
                  { label: '合約起始', value: r10Start }
                ]}
                investedAmount={{
                  label: '已投入金額',
                  value: formatCurrency(r10Cost, 'TWD')
                }}
              />
            )}
          </div>
        </div>

        {/* ARCHIVED: Heatmap Block
           (Temporarily removed as per user request until Google Sheet data is ready)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px] relative z-20">
             <AssetTreemap assets={investAssets} categoryMap={categoryMap} />
        </div>
        */}



        {/* 5. Recurring Items Table (Bottom) */}
        <RecurringTable items={recurringItems} oneOffEvents={oneOffEvents} categoryMap={categoryMap} />

      </main >
    </div >
  );
}
