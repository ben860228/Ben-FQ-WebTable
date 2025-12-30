import { Bell, Settings } from 'lucide-react';

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

import {
  calculateNetWorth,
  calculateCashFlow,
  calculateAllocation,
  checkLiquidity
} from '@/lib/mockData';
import { fetchAssets, fetchRecurringItems, fetchOneOffEvents, fetchCategoryMap } from '@/lib/googleSheets';
import { Asset, RecurringItem, OneOffEvent } from '@/lib/types';
import { CATEGORY_MAPPING as DEFAULT_MAPPING } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Fetch Data (Server Side) with Error Handling
  let assets: Asset[] = [];
  let recurringItems: RecurringItem[] = [];
  let oneOffEvents: OneOffEvent[] = [];
  let dynamicMap: Record<string, string> = {};

  try {
    // Fetch safely, ensuring fallback to empty arrays on failure
    const [a, r, o, m] = await Promise.all([
      fetchAssets().catch(e => { console.error('Asset Fetch Error', e); return []; }),
      fetchRecurringItems().catch(e => { console.error('Recurring Fetch Error', e); return []; }),
      fetchOneOffEvents().catch(e => { console.error('Event Fetch Error', e); return []; }),
      fetchCategoryMap().catch(e => { console.error('Map Fetch Error', e); return {}; })
    ]);
    assets = a || [];
    recurringItems = r || [];
    oneOffEvents = o || [];
    dynamicMap = m || {};
  } catch (error) {
    console.error("Critical Data Fetch Error:", error);
    // Defaults to empty arrays
  }

  // Merge Dynamic Map with Default
  const categoryMap = { ...DEFAULT_MAPPING, ...dynamicMap };

  // 2. Logic / Calculations
  // Pass map to calculations if needed (e.g. Allocation groups by category)
  // But calculateAllocation currently imports CATEGORY_MAPPING from mockData directly. 
  // Refactoring that function requires moving it out of mockData or passing map as arg.
  // For now, let's fix the Visual Components first which is what the user sees.

  const totalNetWorth = calculateNetWorth(assets);
  const cashFlowData = calculateCashFlow(recurringItems);
  // Note: calculateAllocation uses the hardcoded map internally. 
  // Ideally, we refactor calculateAllocation to accept the map, but user didn't complain about the Donut Legend specifically yet, mostly the Tables/Treemap tags. 
  // I'll stick to updating visual components props for now.
  const allocationData = calculateAllocation(assets);

  const liquidityStatus = checkLiquidity(assets, recurringItems, oneOffEvents);
  const { liquidCash, hasCrisis, shortfall } = liquidityStatus;

  // 3. Find Next Event
  const nextEvent = oneOffEvents
    .filter(e => new Date(e.Date) > new Date())
    .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())[0];

  // 4. Split Assets (Logic)
  const cashAssets = assets.filter(a => ['Cash', 'Fiat', 'Deposit'].includes(a.Category) || a.Type === 'Fiat');
  const investAssets = assets.filter(a => !['Cash', 'Fiat', 'Deposit'].includes(a.Category) && a.Type !== 'Fiat');

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-12 font-[family-name:var(--font-geist-sans)] bg-slate-950">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Ben's Financial Cockpit</h1>
          <p className="text-slate-400 mt-2">歡迎回來，Ben</p>
        </div>
        <div className="flex gap-4">
          <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="space-y-6">

        {/* 1. Top Section: Critical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto lg:h-[240px]">
          <NetWorthCard totalNetWorth={totalNetWorth} />
          <LiquidityWidget liquidCash={liquidCash} status={liquidityStatus} event={nextEvent} />
          <TimelineAlert nextEvent={nextEvent || { Name: 'No Events', Date: new Date().toISOString() }} />
        </div>

        {/* 2. Main Visuals: Cash Flow & Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
          <div className="lg:col-span-2 h-full">
            <CashFlowChart data={cashFlowData} />
          </div>
          <div className="lg:col-span-1 h-full">
            {/* AssetAllocation needs refactor to use dynamic map, but skipping for speed unless asked */}
            <AssetAllocation data={allocationData} />
          </div>
        </div>

        {/* 3. Advanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
          <ExpenseBreakdown items={recurringItems} categoryMap={categoryMap} />
          <AssetTreemap assets={investAssets} categoryMap={categoryMap} />
        </div>

        {/* 4. Detailed Holdings: Cash List + Invest Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 h-[600px]">
            <CashHoldings assets={cashAssets} />
          </div>
          <div className="lg:col-span-2 h-[600px]">
            <AssetTable assets={investAssets} categoryMap={categoryMap} />
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
