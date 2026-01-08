'use client';

import { useState, useEffect } from 'react';
import { AlarmClock, Calendar, DollarSign, Info } from 'lucide-react';
import { OneOffEvent } from '@/lib/types';

interface TimelineAlertProps {
    events: OneOffEvent[];
}

export default function TimelineAlert({ events }: TimelineAlertProps) {
    // Sort events by date just in case
    const sortedEvents = [...events].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    // Default to first event or null
    const [selectedEvent, setSelectedEvent] = useState<OneOffEvent | null>(null);

    // Initialize selection when events load
    useEffect(() => {
        if (sortedEvents.length > 0 && !selectedEvent) {
            setSelectedEvent(sortedEvents[0]);
        }
    }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

    // If no events, show empty state
    if (!sortedEvents || sortedEvents.length === 0) {
        return (
            <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-center items-center relative overflow-hidden">
                <AlarmClock className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-slate-500">No Upcoming Events</p>
            </div>
        );
    }

    const current = selectedEvent || sortedEvents[0];
    const daysRemaining = Math.max(0, Math.ceil((new Date(current.Date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="glass-card rounded-[2rem] p-5 h-full flex gap-6 relative overflow-hidden">

            {/* Left: Master Detail View (65%) */}
            {/* Left: Master Detail View (65%) */}
            <div className="flex-1 flex flex-col z-10 min-w-0 mr-2">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-slate-400">即將到來 (Next Event)</h3>
                    <div className="bg-amber-500/10 p-2 rounded-2xl">
                        <AlarmClock className="h-4 w-4 text-amber-500" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-white mb-1 truncate" title={current.Name}>
                        {current.Name}
                    </h2>

                    <div className="flex items-end gap-x-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white font-[family-name:var(--font-share-tech-mono)]">
                                {daysRemaining}
                            </span>
                            <span className="text-xs text-slate-500">Days</span>
                        </div>

                        <div className="flex flex-col gap-1 pb-1">
                            <div className="flex items-center gap-3 text-sm text-slate-300 font-mono">
                                <span>{new Date(current.Date).toLocaleDateString()}</span>
                                <span className="text-slate-600">|</span>
                                <span>${current.Amount?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1" title={current.Note}>
                                {current.Note || 'No notes'}
                                {current.Status && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] border ${current.Status === 'Paid'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                        }`}>
                                        {current.Status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Scrollable List (35%) */}
            <div className="w-[140px] sm:w-[180px] flex-shrink-0 border-l border-slate-800 pl-4 py-1 z-10 flex flex-col">
                <h4 className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Timeline</h4>
                <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                    {sortedEvents.map((event) => {
                        const isSelected = selectedEvent?.ID === event.ID || (!selectedEvent && event.ID === sortedEvents[0].ID);
                        return (
                            <button
                                key={event.ID}
                                onClick={() => setSelectedEvent(event)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-300 border backdrop-blur-sm group relative flex items-center justify-between gap-2 ${isSelected
                                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                                    }`}
                            >
                                <div className={`text-xs font-medium truncate flex-1 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {event.Name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                                    {new Date(event.Date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                </div>
                                {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 w-0.5 h-4 bg-amber-500 rounded-r-full" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Background Effects */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute left-10 bottom-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
        </div>
    );
}
