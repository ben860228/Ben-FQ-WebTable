'use client';

import { AlarmClock } from 'lucide-react';
import { OneOffEvent } from '@/lib/types';

interface TimelineAlertProps {
    nextEvent: OneOffEvent | { Name: string; Date: string; Amount?: number };
}

export default function TimelineAlert({ nextEvent }: TimelineAlertProps) {
    // Calculate days remaining
    const daysRemaining = Math.ceil((new Date(nextEvent.Date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">即將到來 (Next Event)</h3>
                    <p className="text-xl font-bold text-white text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px]">{nextEvent.Name}</p>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-xl">
                    <AlarmClock className="h-5 w-5 text-amber-500" />
                </div>
            </div>

            <div className="z-10 mt-4">
                <div className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-share-tech-mono)]">
                    {daysRemaining > 0 ? daysRemaining : 0} <span className="text-sm font-sans font-normal text-slate-500">天 (Days)</span>
                </div>
                <p className="text-xs text-slate-500">截止日: {new Date(nextEvent.Date).toLocaleDateString()}</p>
            </div>

            {/* Background pulse effect */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
        </div>
    );
}
