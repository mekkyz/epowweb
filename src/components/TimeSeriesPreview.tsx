'use client';

import { useEffect, useState } from 'react';
import { PlugZap, ExternalLink } from 'lucide-react';
import { EmptyState, Button, ChartSkeleton } from '@/components/ui';
import Link from 'next/link';

interface Props {
  url?: string;
  title?: string;
}

export default function TimeSeriesPreview({ url, title }: Props) {
  const [loading, setLoading] = useState(true);

  // Reset loader when URL changes and add a timeout safeguard
  useEffect(() => {
    let cancelled = false;
    // show skeleton until iframe reports ready or timeout
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const t = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [url]);

  if (!url) {
    return (
      <EmptyState
        icon={<PlugZap className="h-10 w-10 text-emerald-400" />}
        title="Select an entity to preview"
        description="Pick a station, building, or meter above to see its time-series visualization."
        className="h-full rounded-xl border border-border bg-surface p-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">

          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">Preview</span>
            <p className="font-semibold text-foreground">{title ?? 'Visualization'}</p>
          </div>
        </div>
        <Link href={url} passHref>
          <Button variant="outline" size="sm" iconRight={<ExternalLink className="h-3.5 w-3.5" />}>
            Open Full View
          </Button>
        </Link>
      </div>

      {/* Preview Content */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-white dark:bg-panel">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <ChartSkeleton />
          </div>
        )}
        <iframe
          key={url}
          src={appendEmbed(url)}
          className="h-[620px] w-full border-0"
          title="Time series visualization"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>
    </div>
  );
}

function appendEmbed(url: string) {
  if (!url) return url;
  const hasQuery = url.includes('?');
  const separator = hasQuery ? '&' : '?';
  return `${url}${separator}embed=1`;
}
