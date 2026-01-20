'use client';

import { PlugZap } from 'lucide-react';

interface Props {
  url?: string;
  title?: string;
}

export default function TimeSeriesPreview({ url, title }: Props) {
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
        <div className="max-w-xl text-center">
          <PlugZap className="mx-auto h-10 w-10 text-emerald-300" />
          <p className="mt-3 text-lg font-semibold text-white">
            Pick a station, building, or meter to see its time-series.
          </p>
          <p className="text-white/60">
            Visualizations are generated in-app from the CSV/PG data.
          </p>
        </div>
      </div>
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
