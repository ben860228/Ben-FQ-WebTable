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
                    Budget Tracker (本月 vs 預算)
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
                        Sync
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {CATEGORIES.map(cat => {
                    // Find Budget
                    const budgetItem = budgets.find(b => b.ID === cat.budgetId);
                    const budgetLimit = budgetItem?.Amount_Base || 0;

                    // Calculate Monthly Actual
                    const monthlyActual = actuals
                        .filter(a => a.YearMonth === currentYearMonth && a.Recurring_Item_ID === cat.budgetId)
                        .reduce((sum, a) => sum + a.Actual_Amount, 0);

                    // Calculate YTD Actual
                    const ytdActual = actuals
                        .filter(a => a.YearMonth.startsWith(String(currentYear)) && a.Recurring_Item_ID === cat.budgetId)
                        .reduce((sum, a) => sum + a.Actual_Amount, 0);

                    const ytdBudget = budgetLimit * monthsPassed;

                    const percent = budgetLimit > 0 ? (monthlyActual / budgetLimit) * 100 : 0;
                    const format = (n: number) => n.toLocaleString('en-US', { useGrouping: false });

                    return (
                        <Card key={cat.id} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-200">
                                    {cat.label} ({cat.id})
                                </CardTitle>
                                <span className="text-xs text-zinc-500">
                                    Limit: ${format(budgetLimit)}
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    ${format(monthlyActual)}
                                </div>
                                <Progress
                                    value={percent}
                                    className={`h-2 mt-2 ${percent > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                                />
                                <p className="text-xs text-zinc-500 mt-2">
                                    YTD: ${format(ytdActual)} / ${format(ytdBudget)}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
