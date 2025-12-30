'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Asset } from '@/lib/types';

// Dynamically import the Treemap logic with NO SSR to prevent hydration mismatch
const ResponsiveTreemap = dynamic<any>(() => import('./AssetTreemapContent'), { ssr: false });

interface AssetTreemapProps {
    assets: Asset[];
    categoryMap?: Record<string, string>;
}

export default function AssetTreemap({ assets, categoryMap = {} }: AssetTreemapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="glass-card rounded-[2rem] p-8 h-full bg-slate-950 border border-slate-800 animate-pulse" />;

    return <ResponsiveTreemap assets={assets} categoryMap={categoryMap} />;
}
