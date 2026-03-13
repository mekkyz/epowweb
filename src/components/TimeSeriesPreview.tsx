"use client";

import { useEffect, useState } from "react";
import { PlugZap, ExternalLink } from "lucide-react";
import { EmptyState, Button, ChartSkeleton } from "@/components/ui";
import Link from "next/link";

interface Props {
  url?: string;
  title?: string;
  disabled?: boolean;
}

export default function TimeSeriesPreview({ url, title, disabled }: Props) {
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
        className="border-border bg-surface h-full rounded-xl border p-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-foreground-tertiary text-xs font-medium tracking-wider uppercase">
              Preview
            </span>
            <p className="text-foreground font-semibold">{title ?? "Visualization"}</p>
          </div>
        </div>
        {disabled ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Full access required"
            iconRight={<ExternalLink className="h-3.5 w-3.5" />}
          >
            Open in Tab
          </Button>
        ) : (
          <Link href={url} target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              size="sm"
              title="Open visualization in new tab"
              iconRight={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Open in Tab
            </Button>
          </Link>
        )}
      </div>

      {/* Preview Content */}
      <div className="border-border bg-panel relative overflow-hidden rounded-xl border">
        {loading && (
          <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
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
  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";
  return `${url}${separator}embed=1`;
}
