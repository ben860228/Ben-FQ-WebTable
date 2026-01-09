'use client';

import { useState } from 'react';
import { Bell, Settings, RefreshCw, SquarePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import LiquidityUpdateDialog from './LiquidityUpdateDialog';
import { Asset } from '@/lib/types';

interface DashboardHeaderActionsProps {
    assets: Asset[];
    rates: { USD: number; JPY: number; TWD: number };
    stockPrices: Record<string, number>;
}

export default function DashboardHeaderActions({ assets, rates, stockPrices }: DashboardHeaderActionsProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        router.refresh(); // Re-fetch server data
    };

    return (
        <>
            <div className="flex gap-4 items-center">
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors"
                    title="Update Assets"
                >
                    <SquarePen className="h-5 w-5" />
                </button>

                <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
                    <Bell className="h-5 w-5" />
                </button>
                <button className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
                    <Settings className="h-5 w-5" />
                </button>
            </div>

            <LiquidityUpdateDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleSuccess}
                assets={assets}
                rates={rates}
                stockPrices={stockPrices}
            />
        </>
    );
}
