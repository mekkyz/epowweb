'use client';

import { useMemo, useState } from 'react';
import { MapPinned, Search } from 'lucide-react';
import { Input, Spinner } from '@/components/ui';
import type { FeatureCollection } from './useHeatmapData';

interface StationRankingsProps {
  features: FeatureCollection | null;
  loading: boolean;
}

export default function StationRankings({ features, loading }: StationRankingsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const list = useMemo(() => {
    const feats = features?.features ?? [];
    const sorted = [...feats].sort((a, b) => b.properties.valueKw - a.properties.valueKw);
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((f) => f.properties.stationId.toLowerCase().includes(q));
  }, [features, searchQuery]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MapPinned className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium text-foreground">Station Rankings</span>
        <span className="ml-auto text-xs text-foreground-tertiary">{list.length} stations</span>
      </div>

      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations..."
            size="sm"
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-[456px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-panel/95 text-xs uppercase tracking-wider text-foreground-secondary backdrop-blur-sm">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Station</th>
              <th className="px-4 py-2.5 text-right font-medium">kW</th>
              <th className="px-4 py-2.5 text-right font-medium">Meters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((f, idx) => (
              <tr
                key={f.properties.stationId}
                className="text-foreground-secondary transition-colors hover:bg-surface"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs text-foreground-tertiary">
                      {idx + 1}
                    </span>
                    {f.properties.stationId}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                  {f.properties.valueKw.toFixed(3)}
                </td>
                <td className="px-4 py-2.5 text-right text-foreground-secondary">
                  {f.properties.meters}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className="px-4 py-8 text-center text-foreground-tertiary" colSpan={3}>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" /> Loading data…
                    </div>
                  ) : searchQuery ? (
                    'No stations match your search.'
                  ) : (
                    'No data available for this timestamp.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
