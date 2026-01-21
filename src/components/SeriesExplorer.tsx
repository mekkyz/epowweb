'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowDownToLine, RefreshCcw, TimerReset } from 'lucide-react';
import SeriesChart from '@/components/SeriesChart';
import { Button, Input } from '@/components/ui';

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
  const [start, setStart] = useState<string | undefined>(undefined);
  const [end, setEnd] = useState<string | undefined>(undefined);
  const [bounds, setBounds] = useState<{ start?: string; end?: string }>({});
  const [refreshNonce, setRefreshNonce] = useState(0);

  const apiBase =
    type === 'meter'
      ? `/api/meters/${id}/series`
      : type === 'building'
        ? `/api/buildings/${id}/series`
        : `/api/stations/${id}/series`;

  useEffect(() => {
    let active = true;
    const loadBounds = async () => {
      const res = await fetch(apiBase);
      if (!res.ok) return;
      const body: SeriesResponse = await res.json();
      if (!active) return;
      setBounds(body.bounds ?? {});
      if (!start && !end && body.bounds?.end) {
        const endTs = body.bounds.end;
        const startTs = dayjs(endTs).subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss');
        setStart(startTs);
        setEnd(endTs);
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

  const resetRange = () => {
    if (bounds.end) {
      const startTs = dayjs(bounds.end).subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss');
      setStart(startTs);
      setEnd(bounds.end);
      setRefreshNonce((n) => n + 1);
    }
  };

  const download = async () => {
    const res = await fetch(fetchUrl);
    const body = await res.json();
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-[0.2em] text-white/60">Start</label>
          <Input
            type="datetime-local"
            value={toLocalInput(start)}
            onChange={(e) => setStart(fromLocalInput(e.target.value))}
            size="sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-[0.2em] text-white/60">End</label>
          <Input
            type="datetime-local"
            value={toLocalInput(end)}
            onChange={(e) => setEnd(fromLocalInput(e.target.value))}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRefreshNonce((n) => n + 1)}
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Show
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetRange}
            icon={<TimerReset className="h-4 w-4" />}
          >
            Last week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            icon={<ArrowDownToLine className="h-4 w-4" />}
          >
            Download JSON
          </Button>
        </div>
        {bounds.start && bounds.end && (
          <div className="text-xs text-white/60">
            Range: {bounds.start} – {bounds.end}
          </div>
        )}
      </div>

      <SeriesChart fetchUrl={fetchUrl} title={`${type.toUpperCase()} ${id}`} />
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
