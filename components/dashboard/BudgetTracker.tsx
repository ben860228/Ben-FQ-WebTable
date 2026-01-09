'use client';

import React, { useState, useTransition } from 'react';
import { syncMozeCsvFromDrive } from '@/app/actions/importMoze';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { RecurringItem, ExpenseHistoryItem } from '@/lib/types';

interface BudgetTrackerProps {
    budgets: RecurringItem[];
    actuals: ExpenseHistoryItem[];
}

const CATEGORIES = [
    { id: 'Food', label: '吃喝', budgetId: 'R35' },
    { id: 'Transport', label: '交通', budgetId: 'R36' },
    { id: 'Shopping', label: '購物', budgetId: 'R37' },
    { id: 'Entertainment', label: '娛樂', budgetId: 'R38' }
];

export function BudgetTracker({ budgets, actuals }: BudgetTrackerProps) {
    const [isSyncing, startTransition] = useTransition();
    const [msg, setMsg] = useState('');

    const handleSync = () => {
        setMsg('');
        startTransition(async () => {
            const res = await syncMozeCsvFromDrive();
            setMsg(res.message);
        });
    };

    const currentYearMonth = new Date().toISOString().slice(0, 7); // "2026-01"
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth(); // 0-based
    const monthsPassed = currentMonthIdx + 1; // 1 (Jan)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
                    年度預算追蹤
                </h2>
                <div className="flex items-center gap-2">
                    {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        同步
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {CATEGORIES.map(cat => {
                    // 1. Core Data
                    const budgetItem = budgets.find(b => b.ID === cat.budgetId);
                    const monthlyBase = budgetItem?.Amount_Base || 0;
                    const annualLimit = monthlyBase * 12;

                    // 2. YTD Actual
                    const ytdActual = Math.abs(actuals
                        .filter(a => a.YearMonth.startsWith(String(currentYear)) && a.Recurring_Item_ID === cat.budgetId)
                        .reduce((sum, a) => sum + a.Actual_Amount, 0));

                    // 3. Current Month Actual
                    const currentMonthActual = Math.abs(actuals
                        .filter(a => a.YearMonth === currentYearMonth && a.Recurring_Item_ID === cat.budgetId)
                        .reduce((sum, a) => sum + a.Actual_Amount, 0));

                    // 4. Advanced Logic: Daily Forecast
                    // Get Day of Year
                    const now = new Date();
                    const start = new Date(currentYear, 0, 0);
                    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
                    const oneDay = 1000 * 60 * 60 * 24;
                    const daysPassed = Math.floor(diff / oneDay);

                    const avgDailySpend = daysPassed > 0 ? ytdActual / daysPassed : 0;
                    const remainingBudget = annualLimit - ytdActual;
                    const daysToDeplete = avgDailySpend > 0 ? remainingBudget / avgDailySpend : 9999;

                    const forecastDate = new Date();
                    forecastDate.setDate(now.getDate() + daysToDeplete);

                    const isHealthy = forecastDate.getFullYear() > currentYear;
                    const forecastStr = isHealthy
                        ? `財務健康：極佳 (可維持至 ${forecastDate.toLocaleDateString()})`
                        : `預計耗盡日期：${forecastDate.toLocaleDateString()}`;

                    // 5. Advanced Logic: Dynamic Rolling Budget
                    // Logic: (Annual - Spent_Prev_Months) / Remaining_Months
                    // Spent_Prev_Months = YTD - CurrentMonth
                    // Remaining_Months = 12 - CurrentMonthIndex (e.g., Jan=0, Remaining=12? No. logic: Jan is 1st month. 
                    // If we are in Jan (idx 0), we divide Annual by 12.
                    // If we are in Feb (idx 1), we have 11 months left including Feb.
                    // Rolling Base = (Annual - Spent_Before_This_Month) / (12 - MonthIdx)

                    const spentPrior = ytdActual - currentMonthActual;
                    const monthsRemaining = 12 - currentMonthIdx;
                    const dynamicMonthlyLimit = monthsRemaining > 0
                        ? (annualLimit - spentPrior) / monthsRemaining
                        : 0;

                    const isMonthlyOver = currentMonthActual > dynamicMonthlyLimit;
                    const percent = annualLimit > 0 ? (ytdActual / annualLimit) * 100 : 0;
                    const format = (n: number) => Math.round(n).toLocaleString('en-US');

                    return (
                        <Card key={cat.id} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm relative overflow-hidden">
                            {/* Monthly Warning Overlay (Subtle Border) */}
                            {isMonthlyOver && <div className="absolute inset-0 border-2 border-red-500/20 rounded-xl pointer-events-none" />}

                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-200">
                                    {cat.label} ({cat.id})
                                </CardTitle>
                                {isMonthlyOver && <span className="text-xs font-bold text-red-400 animate-pulse">本月超支！</span>}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    ${format(annualLimit - ytdActual)}
                                    <span className="text-xs font-normal text-zinc-500 ml-2">剩餘</span>
                                </div>
                                <Progress
                                    value={percent}
                                    className={`h-2 mt-2 [&>div]:${isHealthy ? 'bg-cyan-500' : 'bg-amber-500'}`}
                                />
                                <div className="flex justify-between text-base font-medium mt-3">
                                    <span className="text-cyan-400">已花費: ${format(ytdActual)}</span>
                                    <span className="text-zinc-400">目標: ${format(annualLimit)}</span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1">
                                    {/* Daily Analysis */}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">平均日花費:</span>
                                        <span className="text-zinc-300 font-mono">${format(avgDailySpend)}</span>
                                    </div>

                                    {/* Forecast */}
                                    <div className={`text-xs font-medium ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {forecastStr}
                                    </div>

                                    {/* Rolling Monthly Context */}
                                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-zinc-800/50">
                                        <span className="text-zinc-500">本月花費:</span>
                                        <span className={`${isMonthlyOver ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                                            ${format(currentMonthActual)} / ${format(dynamicMonthlyLimit)}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-600 text-right">
                                        (動態滾動月目標)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
