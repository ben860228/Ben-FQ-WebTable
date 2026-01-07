import React from 'react';
import { OneOffEvent } from '@/lib/types';
import { Calendar, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

interface OneOffEventsProps {
    events: OneOffEvent[];
}

export default function OneOffEvents({ events }: OneOffEventsProps) {
    // Sort by date ascending to show nearest events
    const sortedEvents = [...events].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    if (sortedEvents.length === 0) return null;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-medium text-slate-200">單次事件</h3>
                </div>
                <span className="text-xs text-slate-500">Included in Cash Flow</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortedEvents.map((event) => {
                    const isIncome = event.Type === 'Income';
                    const date = new Date(event.Date);
                    const isPast = date < new Date();

                    return (
                        <div
                            key={event.ID}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isPast ? 'bg-slate-800/40 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`shrink-0 w-1 h-8 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-500">{event.Date}</span>
                                        <h4 className="text-sm font-medium text-slate-200 truncate" title={event.Name}>{event.Name}</h4>
                                    </div>
                                    {event.Note && <p className="text-[10px] text-slate-500 truncate">{event.Note}</p>}
                                </div>
                            </div>

                            <div className={`text-sm font-bold font-mono tracking-tight shrink-0 pl-3 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isIncome ? '+' : '-'}{event.Amount.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
