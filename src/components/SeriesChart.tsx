'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface SeriesPoint {
  start: string;
  powerKw: number | null;
}

interface Props {
  fetchUrl?: string;
  title?: string;
}

export default function SeriesChart({ fetchUrl, title }: Props) {
  const [data, setData] = useState<SeriesPoint[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!fetchUrl) return;
    let active = true;
    const load = async () => {
      setStatus('loading');
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const body = await res.json();
        const series = (body.series ?? []) as {
          start: string;
          powerKw?: number | null;
          power?: number | null;
        }[];
        if (!active) return;
        setData(
          series.map((row) => ({
            start: row.start,
            powerKw: row.powerKw ?? row.power ?? null,
          })),
        );
        setStatus('idle');
      } catch (err) {
        console.error(err);
        if (active) setStatus('error');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchUrl]);

  if (!fetchUrl || !mounted) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-3xl border border-white/10 bg-black/40 text-white/60">
        Missing data source.
      </div>
    );
  }

  return (
    <div
      className="h-[420px] w-full rounded-3xl border border-white/10 bg-black/40 p-4 shadow-inner shadow-black/30 backdrop-blur"
      style={{ minWidth: 320 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Power [kW]</p>
          <p className="text-sm font-semibold text-white">
            {title ?? 'Time-series aggregation'}
          </p>
        </div>
        <div className="text-xs text-white/60">
          {status === 'loading' && 'Loading…'}
          {status === 'error' && 'Failed to load'}
          {status === 'idle' && `${data.length} points`}
        </div>
      </div>
      <div className="h-[340px]" style={{ minWidth: 280, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64d4a3" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#64d4a3" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="start"
              tickFormatter={(value) => value?.slice(11, 16)}
              stroke="rgba(255,255,255,0.4)"
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(v) => `${v}`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#0b1020', border: '1px solid rgba(255,255,255,0.1)' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: ValueType | undefined) =>
                [`${value ?? '–'} kW`, 'Power'] as [string, string]
              }
            />
            <Area
              type="monotone"
              dataKey="powerKw"
              stroke="#64d4a3"
              fillOpacity={1}
              fill="url(#colorPower)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
