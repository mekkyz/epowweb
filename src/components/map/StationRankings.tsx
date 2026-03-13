"use client";

import { useMemo, useState } from "react";
import { MapPinned, Search } from "lucide-react";
import { Input, Spinner } from "@/components/ui";
import type { FeatureCollection } from "./useHeatmapData";

interface StationRankingsProps {
  features: FeatureCollection | null;
  loading: boolean;
}

export default function StationRankings({ features, loading }: StationRankingsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const list = useMemo(() => {
    const feats = features?.features ?? [];
    const sorted = [...feats].sort((a, b) => b.properties.valueKw - a.properties.valueKw);

    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();

    return sorted.filter((f) => f.properties.stationId.toLowerCase().includes(q));
  }, [features, searchQuery]);

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border shadow-lg">
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <MapPinned className="h-4 w-4 text-emerald-400" />
        <span className="text-foreground text-sm font-medium">Station Rankings</span>
        <span className="text-foreground-tertiary ml-auto text-xs">{list.length} stations</span>
      </div>

      <div className="border-border border-b p-3">
        <div className="relative">
          <Search className="text-foreground-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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
          <thead className="bg-panel/95 text-foreground-secondary sticky top-0 text-xs tracking-wider uppercase backdrop-blur-sm">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Station</th>
              <th className="px-4 py-2.5 text-right font-medium">kW</th>
              <th className="px-4 py-2.5 text-right font-medium">Meters</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {list.map((f, idx) => (
              <tr
                key={f.properties.stationId}
                className="text-foreground-secondary hover:bg-surface transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-surface text-foreground-tertiary flex h-5 w-5 items-center justify-center rounded-full text-xs">
                      {idx + 1}
                    </span>
                    {f.properties.stationId}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                  {f.properties.valueKw.toFixed(3)}
                </td>
                <td className="text-foreground-secondary px-4 py-2.5 text-right">
                  {f.properties.meters}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className="text-foreground-tertiary px-4 py-8 text-center" colSpan={3}>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" /> Loading data…
                    </div>
                  ) : searchQuery ? (
                    "No stations match your search."
                  ) : (
                    "No data available for this timestamp."
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
