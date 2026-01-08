'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { ArrowUpRight, Wallet } from 'lucide-react';

interface NetWorthCardProps {
    totalNetWorth: number;
    totalLiability?: number;
    liabilityName?: string;
}

export default function NetWorthCard({ totalNetWorth, totalLiability, liabilityName }: NetWorthCardProps) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const displayValue = useTransform(spring, (current) =>
        Math.round(current).toLocaleString('en-US')
    );

    useEffect(() => {
        spring.set(totalNetWorth);
    }, [totalNetWorth, spring]);

    return (
        <div className="glass-card rounded-[2rem] p-5 relative overflow-hidden group h-full flex flex-col justify-between">
            <div className="flex flex-row items-center justify-between space-y-0 z-10 relative mb-4 h-8">
                <h3 className="text-sm font-medium text-slate-400">總淨資產 (Net Worth)</h3>
                <div className="p-2 bg-violet-500/10 rounded-2xl">
                    <Wallet className="h-4 w-4 text-violet-400" />
                </div>
            </div>
            <div className="z-10 relative flex-1 flex flex-col justify-center">
                <motion.div className="flex items-baseline space-x-2 text-white mb-2 font-[family-name:var(--font-geist-sans)]">
                    <span className="text-xl font-medium text-slate-500">NT$</span>
                    <motion.span className="text-3xl md:text-4xl font-bold tracking-tight">
                        {displayValue}
                    </motion.span>
                </motion.div>

                <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 flex items-center">
                        <ArrowUpRight className="h-3 w-3 text-red-400 mr-1" />
                        <span className="text-red-400 text-xs font-bold">+2.5%</span>
                    </div>
                    <span className="text-slate-500 text-xs">較上月</span>
                </div>

                {totalLiability && totalLiability > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/30 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{liabilityName || 'Loan'}</span>
                        <span className="text-xs font-medium text-slate-400 font-mono">
                            - ${(totalLiability).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>
            {/* Decorative gradient orb */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-600/20 blur-[80px] rounded-full pointer-events-none" />
        </div>
    );
}
