'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ArrowDownToLine,
  ImageDown,
  RefreshCcw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import SeriesChart from '@/components/SeriesChart';
import { Button, Input, Select, ChartSkeleton, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { downloadBlob } from '@/lib/download';

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
  const { isDemo } = useAuth();
  const [start, setStart] = useState<string | undefined>(undefined);
  const [end, setEnd] = useState<string | undefined>(undefined);
  const [bounds, setBounds] = useState<{ start?: string; end?: string }>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rangeUnit, setRangeUnit] = useState<'day' | 'week' | 'month'>('day');

  const expandRange = (direction: 1 | -1) => {
    const startDate = dayjs(start || bounds.start);
    const endDate = dayjs(end || bounds.end);
    if (!startDate.isValid() || !endDate.isValid()) return;
    const newStart = startDate.add(-direction, rangeUnit);
    const newEnd = endDate.add(direction, rangeUnit);
    if (newStart.isAfter(newEnd) || newStart.isSame(newEnd)) return;
    setStart(newStart.format('YYYY-MM-DD HH:mm:ss'));
    setEnd(newEnd.format('YYYY-MM-DD HH:mm:ss'));
    setRefreshNonce((n) => n + 1);
  };

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
          const json = await res.json().catch(() => null);
          const code = json?.error?.code;
          if (res.status === 404 || code === 'NOT_FOUND') {
            showError('No data available for this entity');
          } else {
            showError('Failed to load data bounds');
          }
          return;
        }
        const raw = await res.json();
        const body: SeriesResponse = raw?.data ?? raw;
        if (!active) return;
        const b = body.bounds ?? {};
        setBounds(b);
        if (!b.start && !b.end) {
          showError('No data available for this time range');
          return;
        }
        if (!start && !end && b.start && b.end) {
          const boundsStart = dayjs(b.start);
          const boundsEnd = dayjs(b.end);
          const midpoint = boundsStart.add(boundsEnd.diff(boundsStart) / 2, 'millisecond');
          const startTs = midpoint.format('YYYY-MM-DD HH:mm:ss');
          const endTs = midpoint.add(7, 'day').format('YYYY-MM-DD HH:mm:ss');
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
    const startParam = fromLocalInput(start);
    const endParam = fromLocalInput(end);
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
        downloadBlob(
          JSON.stringify(series, null, 2),
          `${type}-${id}-${Date.now()}.json`,
          'application/json',
        );
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
        downloadBlob(rows.join('\n'), `${type}-${id}-${Date.now()}.csv`, 'text/csv');
      }
      success(`Data downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to download data');
    }
  };

  const downloadPng = async () => {
    const container = document.getElementById('series-chart-container');
    const svg = container?.querySelector('.recharts-wrapper svg') as SVGSVGElement | null;
    if (!svg) {
      showError('Chart not ready');
      return;
    }
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const { width: svgW, height: svgH } = svg.getBoundingClientRect();
      clone.setAttribute('width', String(svgW));
      clone.setAttribute('height', String(svgH));
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Inline computed font styles so they survive serialization
      const origTexts = svg.querySelectorAll('text, tspan');
      const cloneTexts = clone.querySelectorAll('text, tspan');
      origTexts.forEach((orig, i) => {
        const cs = getComputedStyle(orig);
        const el = cloneTexts[i] as SVGElement;
        if (el) {
          el.style.fontFamily = cs.fontFamily;
          el.style.fontSize = cs.fontSize;
          el.style.fontWeight = cs.fontWeight;
          el.style.fill = cs.fill;
        }
      });

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(clone);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const scale = 2;
      const pad = 16 * scale;
      const headerH = 52 * scale;
      const footerH = 22 * scale;
      const canvas = document.createElement('canvas');
      canvas.width = svgW * scale + 2 * pad;
      canvas.height = svgH * scale + headerH + footerH;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = isDark ? '#0b1020' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const textColor = isDark ? '#e2e8f0' : '#1a202c';
      const mutedColor = isDark ? '#94a3b8' : '#64748b';
      const accentColor = isDark ? '#34d399' : '#059669';

      // Title
      ctx.fillStyle = textColor;
      ctx.font = `bold ${15 * scale}px "Work Sans", system-ui, sans-serif`;
      const title = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${id}`;
      ctx.fillText(title, pad, pad + 16 * scale);

      // Time range on second line
      ctx.fillStyle = mutedColor;
      ctx.font = `${10 * scale}px "Work Sans", system-ui, sans-serif`;
      const fmt = (s?: string) => s ? dayjs(s).format('MMM D, YYYY HH:mm') : '—';
      ctx.fillText(`${fmt(start || bounds.start)}  →  ${fmt(end || bounds.end)}`, pad, pad + 30 * scale);

      // Stats on the right — each stat as a column
      const statsEl = container?.querySelectorAll('[class*="text-right"]');
      if (statsEl && statsEl.length >= 4) {
        const labels = ['Min', 'Avg', 'Median', 'Max'];
        const colors = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24'];
        let statX = canvas.width - pad;
        ctx.textAlign = 'right';
        for (let i = labels.length - 1; i >= 0; i--) {
          const valEl = statsEl[i]?.querySelector('p:last-child');
          const val = valEl?.textContent || '—';

          ctx.font = `bold ${12 * scale}px "Work Sans", system-ui, sans-serif`;
          const valW = ctx.measureText(val).width;
          ctx.font = `${9 * scale}px "Work Sans", system-ui, sans-serif`;
          const labelW = ctx.measureText(labels[i]).width;
          const colW = Math.max(valW, labelW);

          ctx.fillStyle = colors[i];
          ctx.font = `bold ${12 * scale}px "Work Sans", system-ui, sans-serif`;
          ctx.fillText(val, statX, pad + 16 * scale);

          ctx.fillStyle = mutedColor;
          ctx.font = `${9 * scale}px "Work Sans", system-ui, sans-serif`;
          ctx.fillText(labels[i], statX, pad + 30 * scale);

          statX -= colW + 32 * scale;
        }
        ctx.textAlign = 'left';
      }

      // Chart image
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, pad, headerH, svgW * scale, svgH * scale);
        URL.revokeObjectURL(url);

        // Footer
        const footerY = headerH + svgH * scale + 14 * scale;
        ctx.fillStyle = accentColor;
        ctx.font = `${9 * scale}px "Work Sans", system-ui, sans-serif`;
        ctx.fillText('Power consumption (kW)', pad, footerY);

        ctx.fillStyle = mutedColor;
        ctx.textAlign = 'right';
        ctx.fillText('© ESA, IAI-KIT', canvas.width - pad, footerY);
        ctx.textAlign = 'left';

        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${type}-${id}-${Date.now()}.png`;
        a.click();
        success('Chart downloaded as PNG');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        showError('Failed to export chart as PNG');
      };
      img.src = url;
    } catch (err) {
      console.error('PNG download failed:', err);
      showError('Failed to export chart as PNG');
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
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range Inputs with shift arrows */}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="self-end"
              onClick={() => shiftRange(-1)}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Shift range backward'}
              aria-label="Shift range backward"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
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
                className="bg-white py-1 dark:bg-background"
                disabled={isDemo}
                title={isDemo ? 'Full access required' : undefined}
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
                className="bg-white py-1 dark:bg-background"
                disabled={isDemo}
                title={isDemo ? 'Full access required' : undefined}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-end"
              onClick={() => shiftRange(1)}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Shift range forward'}
              aria-label="Shift range forward"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Expand/Shrink Range */}
          <div className="flex items-end gap-1 border-l border-border pl-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => expandRange(-1)}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : `Shrink range by 1 ${rangeUnit}`}
              aria-label="Shrink range"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Select
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={rangeUnit}
              onChange={(e) => setRangeUnit(e.target.value as 'day' | 'week' | 'month')}
              disabled={isDemo}
              size="sm"
              className="bg-white py-1 border-border-strong dark:bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => expandRange(1)}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : `Expand range by 1 ${rangeUnit}`}
              aria-label="Expand range"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Refresh data'}
              icon={<RefreshCcw className="h-4 w-4" />}
            >
              Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download('json')}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Download data as JSON'}
              icon={<ArrowDownToLine className="h-4 w-4" />}
            >
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download('csv')}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Download data as CSV'}
              icon={<ArrowDownToLine className="h-4 w-4" />}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPng}
              disabled={isDemo}
              title={isDemo ? 'Full access required' : 'Download chart as PNG'}
              icon={<ImageDown className="h-4 w-4" />}
            >
              PNG
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

function fromLocalInput(val?: string) {
  if (!val) return undefined;
  const d = dayjs(val);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : undefined;
}
