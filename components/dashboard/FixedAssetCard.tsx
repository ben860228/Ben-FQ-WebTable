import React from 'react';

interface FixedAssetCardProps {
    title: string;
    subTitle: string;
    value: number;
    currency?: string;
    icon?: React.ReactNode;
    details?: {
        label: string;
        value: string | number;
        subText?: string;
    }[];
    investedAmount?: {
        label: string;
        value: string | number;
    };
    isConverted?: boolean;
}

export default function FixedAssetCard({ title, subTitle, value, currency = "TWD", icon, details, investedAmount, isConverted }: FixedAssetCardProps) {
    return (
        <div className="glass-card rounded-[2rem] p-5 h-full flex flex-col justify-between border border-slate-800 bg-slate-950 overflow-hidden">
            <div>
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-xs font-medium text-slate-400">{title}</h3>
                        <p className="text-xl font-bold text-white mt-0.5">{subTitle}</p>
                    </div>
                    {icon && (
                        <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            {icon}
                        </div>
                    )}
                </div>

                <div className="text-3xl font-bold text-white tracking-tight flex items-baseline">
                    {isConverted && <span className="text-slate-500 mr-1 text-2xl">*</span>}
                    <span className="text-sm font-medium text-slate-500 mr-1">{currency === 'TWD' ? 'NT$' : currency}</span>
                    {value.toLocaleString()}
                </div>

                {/* New: Invested Amount (Green Box) */}
                {investedAmount && (
                    <div className="mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ring-1 ring-emerald-500/10">
                        <p className="text-[10px] uppercase text-emerald-400/80 font-medium tracking-wider mb-0.5">{investedAmount.label}</p>
                        <p className="text-lg font-bold text-emerald-400">{investedAmount.value}</p>
                    </div>
                )}
            </div>

            {/* Optional Details Grid (for Insurance etc) */}
            {details && details.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/50 grid grid-cols-2 gap-2">
                    {details.map((detail, idx) => (
                        <div key={idx}>
                            <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wider">{detail.label}</p>
                            <p className="text-sm font-semibold text-slate-300">{detail.value}</p>
                            {detail.subText && <p className="text-[10px] text-slate-600">{detail.subText}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
