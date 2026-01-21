'use client';

import { PlugZap } from 'lucide-react';
import { EmptyState } from '@/components/ui';

interface Props {
  url?: string;
  title?: string;
}

export default function TimeSeriesPreview({ url, title }: Props) {
  if (!url) {
    return (
      <EmptyState
        icon={<PlugZap className="h-10 w-10 text-emerald-300" />}
        title="Pick a station, building, or meter to see its time-series."
        description="Visualizations are generated in-app from the CSV/PG data."
        className="h-full rounded-3xl border border-white/10 bg-white/5 p-6"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span className="text-xs uppercase tracking-[0.2em] text-white/50">Time-series</span>
        <span className="font-semibold text-white">{title ?? 'Preview'}</span>
      </div>
      <iframe
        key={url}
        src={appendEmbed(url)}
        className="h-[620px] w-full border-0"
        title="Time series visualization"
      />
    </div>
  );
}

function appendEmbed(url: string) {
  if (!url) return url;
  const hasQuery = url.includes('?');
  const separator = hasQuery ? '&' : '?';
  return `${url}${separator}embed=1`;
}
