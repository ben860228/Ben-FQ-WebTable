import { Bell, Settings, RefreshCw, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';

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

import {
  calculateNetWorth,
  calculateCashFlow,
  calculateAllocation,
  checkLiquidity
} from '@/lib/mockData';
import {
  fetchAssets,
  fetchRecurringItems,
  fetchOneOffEvents,
  fetchCategoryMap,
  fetchDebtDetails,
  fetchInsuranceDetails
} from '@/lib/googleSheets';
import { ExchangeRates } from '@/lib/currency'; // Only Import Type
import { fetchStockPrices, StockData } from '@/lib/stocks';
import { Asset, RecurringItem, OneOffEvent, DebtDetail, InsuranceDetail } from '@/lib/types';
import { CATEGORY_MAPPING as DEFAULT_MAPPING } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Fetch Data (Server Side) with Error Handling
  let assets: Asset[] = [];
  let recurringItems: RecurringItem[] = [];
  let oneOffEvents: OneOffEvent[] = [];
  let dynamicMap: Record<string, string> = {};

  // New Data
  let debtR33: DebtDetail[] = [];
  let insR09: InsuranceDetail[] = [];
  let insR10: InsuranceDetail[] = [];

  // Currency State
  let exchangeData = {
    rates: { USD: 32.5, JPY: 0.22, TWD: 1 } as ExchangeRates,
    isLive: false
  };

  // Stock State
  let stockData: StockData = { prices: {}, status: 'OFFLINE' };

  try {
    // Phase 1: Fetch Base Data & Currency
    const [a, r, o, m, d33, i09, i10] = await Promise.all([
      fetchAssets().catch(e => { console.error('Asset Fetch Error', e); return []; }),
      fetchRecurringItems().catch(e => { console.error('Recurring Fetch Error', e); return []; }),
      fetchOneOffEvents().catch(e => { console.error('Event Fetch Error', e); return []; }),
      fetchCategoryMap().catch(e => { console.error('Map Fetch Error', e); return {}; }),
      fetchDebtDetails('R33_Debt_Table').catch(e => { console.error('R33 Fetch Error', e); return []; }),
      fetchInsuranceDetails('R09_Ins_Table').catch(e => { console.error('R09 Fetch Error', e); return []; }),
      fetchInsuranceDetails('R10_Ins_Table').catch(e => { console.error('R10 Fetch Error', e); return []; })
    ]);

    assets = a || [];
    recurringItems = r || [];
    oneOffEvents = o || [];
    dynamicMap = m || {};
    debtR33 = d33 || [];
    insR09 = i09 || [];
    insR10 = i10 || [];

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

  // Prepare Insurance Map for Calculation
  const insuranceDetailsMap: Record<string, InsuranceDetail[]> = {
    'R09': insR09,
    'R10': insR10
  };

  // 2. Logic / Calculations
  const { rates, isLive } = exchangeData;
  const { prices: stockPrices, status: stockStatus, error: stockError } = stockData;

  const totalNetWorth = calculateNetWorth(assets, rates, stockPrices);
  // Pass insurance map and rates to calculation
  const cashFlowData = calculateCashFlow(recurringItems, totalNetWorth, insuranceDetailsMap, rates);

  const allocationData = calculateAllocation(assets, rates, stockPrices);
  const liquidityStatus = checkLiquidity(assets, recurringItems, oneOffEvents, rates, stockPrices);
  const { liquidCash } = liquidityStatus;

  // 3. Find Next Event
  const nextEvent = oneOffEvents
    .filter(e => new Date(e.Date) > new Date())
    .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())[0];

  // 4. Split Assets (Logic)
  const cashAssets = assets.filter(a => ['Cash', 'Fiat', 'Deposit'].includes(a.Category) || a.Type === 'Fiat');
  const investAssets = assets.filter(a => !['Cash', 'Fiat', 'Deposit'].includes(a.Category) && a.Type !== 'Fiat');

  // 5. Lookups per User Request
  const r33Name = recurringItems.find(i => i.ID === 'R33')?.Name;

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

          <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="space-y-8">

        {/* 1. Top Section: Critical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 h-auto lg:h-[180px]">
          <div className="lg:col-span-4">
            <NetWorthCard totalNetWorth={totalNetWorth} />
          </div>
          <div className="lg:col-span-3">
            <LiquidityWidget liquidCash={liquidCash} status={liquidityStatus} event={nextEvent} />
          </div>
          <div className="lg:col-span-5">
            <TimelineAlert
              events={oneOffEvents.filter(e => new Date(e.Date) > new Date()).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())}
            />
          </div>
        </div>

        {/* 2. Main Visuals: Cash Flow & Expense */}
        {/* Changed from fixed h-[400px] to auto to prevent overlap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-30">
          <div className="lg:col-span-2 h-[450px]">
            {/* Passed data contains isConverted flags */}
            <CashFlowChart data={cashFlowData} />
          </div>
          <div className="lg:col-span-1 h-[450px]">
            <ExpenseBreakdown items={recurringItems} categoryMap={categoryMap} />
          </div>
        </div>

        {/* 2.5 Debt Dashboard (New Section) */}
        {/* Only show if data exists */}
        {debtR33.length > 0 && (
          <div className="w-full">
            <DebtDashboard data={debtR33} r33Name={r33Name} />
          </div>
        )}

        {/* 3. Asset Allocation & Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px] relative z-20">
          <div className="lg:col-span-1 h-full">
            <AssetAllocation data={allocationData} />
          </div>
          <div className="lg:col-span-2 h-full">
            <AssetTreemap assets={investAssets} categoryMap={categoryMap} />
          </div>
        </div>

        {/* 4. Detailed Holdings: Cash List + Invest Table */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 h-[600px]">
            <CashHoldings assets={cashAssets} />
          </div>
          <div className="lg:col-span-3 h-[600px]">
            {/* Rates cast to any/Record to satisfy prop type */}
            <AssetTable assets={investAssets} categoryMap={categoryMap} stockPrices={stockPrices} rates={rates as unknown as Record<string, number>} />
          </div>
        </div>

        {/* 5. Recurring Items Table (Bottom) */}
        <div>
          <RecurringTable items={recurringItems} categoryMap={categoryMap} />
        </div>

      </main>
    </div>
  );
}
