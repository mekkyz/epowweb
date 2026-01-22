'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ArrowDownToLine,
  RefreshCcw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import SeriesChart from '@/components/SeriesChart';
import { Button, Input, ChartSkeleton, useToast } from '@/components/ui';

type SeriesType = 'meter' | 'building' | 'station';

interface SeriesResponse {
  series: { start: string; powerKw?: number | null; power?: number | null }[];
  bounds?: { start?: string; end?: string };
}

interface Props {
  type: SeriesType;
  id: string;
}

export default function SeriesExplorer({ type, id }: Props) {
  const { success, error: showError } = useToast();
  const [start, setStart] = useState<string | undefined>(undefined);
  const [end, setEnd] = useState<string | undefined>(undefined);
  const [bounds, setBounds] = useState<{ start?: string; end?: string }>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);

  const apiBase =
    type === 'meter'
      ? `/api/meters/${id}/series`
      : type === 'building'
        ? `/api/buildings/${id}/series`
        : `/api/stations/${id}/series`;

  useEffect(() => {
    let active = true;
    const loadBounds = async () => {
      try {
        const res = await fetch(apiBase);
        if (!res.ok) {
          showError('Failed to load data bounds');
          return;
        }
        const raw = await res.json();
        const body: SeriesResponse = raw?.data ?? raw;
        if (!active) return;
        setBounds(body.bounds ?? {});
        if (!start && !end && body.bounds?.end) {
          const endTs = body.bounds.end;
          const startTs = dayjs(endTs).subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss');
          setStart(startTs);
          setEnd(endTs);
        }
      } catch (err) {
        console.error('Failed to load bounds:', err);
        showError('Failed to connect to API');
      } finally {
        if (active) setInitialLoading(false);
      }
    };
    loadBounds();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const fetchUrl = useMemo(() => {
    const startParam = formatForApi(start);
    const endParam = formatForApi(end);
    const params = new URLSearchParams();
    if (startParam) params.set('start', startParam);
    if (endParam) params.set('end', endParam);
    params.set('limit', '2000'); // larger window for stations
    return `${apiBase}?${params.toString()}&nonce=${refreshNonce}`;
  }, [apiBase, start, end, refreshNonce]);

  const shiftRange = (direction: 1 | -1) => {
    const startDate = dayjs(start || bounds.start);
    const endDate = dayjs(end || bounds.end);
    if (!startDate.isValid() || !endDate.isValid()) return;
    let deltaMs = endDate.valueOf() - startDate.valueOf();
    if (deltaMs <= 0) deltaMs = 7 * 24 * 3600 * 1000; // default 7 days
    const newStart = startDate.add(deltaMs * direction).format('YYYY-MM-DD HH:mm:ss');
    const newEnd = endDate.add(deltaMs * direction).format('YYYY-MM-DD HH:mm:ss');
    setStart(newStart);
    setEnd(newEnd);
    setRefreshNonce((n) => n + 1);
  };

  const download = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        showError('Failed to download data');
        return;
      }
      const raw = await res.json();
      const series =
        raw?.data?.series ??
        raw?.series ??
        raw?.data ??
        [];

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(series, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${id}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const rows = ['start,end,powerKw,powerOriginalKw,energyKwh,energyOriginalKwh,errorCode'];
        (series as unknown[]).forEach((row) => {
          const r = row as Record<string, unknown>;
          rows.push(
            [
              r.start ?? '',
              r.end ?? '',
              (r.powerKw as string | number | undefined) ??
                (r.power as string | number | undefined) ??
                '',
              r.powerOriginalKw ?? '',
              r.energyKwh ?? '',
              r.energyOriginalKwh ?? '',
              r.errorCode ?? '',
            ].join(','),
          );
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${id}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      success(`Data downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to download data');
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded-xl bg-surface" />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <div className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-foreground-secondary">
                <Calendar className="h-3 w-3" />
                Start
              </label>
              <Input
                type="datetime-local"
                value={toLocalInput(start)}
                onChange={(e) => setStart(fromLocalInput(e.target.value))}
                size="sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-foreground-secondary">
                <Clock className="h-3 w-3" />
                End
              </label>
              <Input
                type="datetime-local"
                value={toLocalInput(end)}
                onChange={(e) => setEnd(fromLocalInput(e.target.value))}
                size="sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftRange(-1)}
                aria-label="Shift range backward"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftRange(1)}
                aria-label="Shift range forward"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRefreshNonce((n) => n + 1)}
              icon={<RefreshCcw className="h-4 w-4" />}
            >
              Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download('json')}
              icon={<ArrowDownToLine className="h-4 w-4" />}
            >
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download('csv')}
              icon={<ArrowDownToLine className="h-4 w-4" />}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Data Range Info */}
        {bounds.start && bounds.end && (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-foreground-tertiary">Available range:</span>
            <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-foreground-secondary">
              {dayjs(bounds.start).format('MMM D, YYYY')}
            </span>
            <span className="text-xs text-foreground-tertiary">→</span>
            <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-foreground-secondary">
              {dayjs(bounds.end).format('MMM D, YYYY')}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <SeriesChart fetchUrl={fetchUrl} title={`${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`} />
    </div>
  );
}

function toLocalInput(ts?: string) {
  if (!ts) return '';
  const d = dayjs(ts);
  return d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : '';
}

function fromLocalInput(val: string) {
  if (!val) return undefined;
  const d = dayjs(val);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : undefined;
}

function formatForApi(val?: string) {
  if (!val) return undefined;
  const d = dayjs(val);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : undefined;
}
