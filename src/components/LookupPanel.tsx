'use client';

import { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  buildingOptions,
  meterOptions,
  stationOptions,
} from '@/data/grid';

type EntityType = 'station' | 'building' | 'meter';

interface Props {
  onPreview?: (url: string) => void;
}

export default function LookupPanel({ onPreview }: Props) {
  const [station, setStation] = useState(stationOptions[0]?.id ?? '');
  const [building, setBuilding] = useState(buildingOptions[0]?.id ?? '');
  const [meter, setMeter] = useState(meterOptions[0]?.id ?? '');

  const openTarget = (type: EntityType, previewOnly = false) => {
    const id = type === 'station' ? station : type === 'building' ? building : meter;
    if (!id) return;

    const target = `/visualization/${type}/${id}`;
    if (previewOnly) {
      onPreview?.(target);
      return;
    }
    window.location.assign(target);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
          Jump to data
        </p>
        <p className="text-lg font-semibold text-white">
          Stations, buildings, and meters
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <LookupSelect
          label="Stations"
          value={station}
          onChange={setStation}
          options={stationOptions}
          onPreview={() => openTarget('station', true)}
          onOpen={() => openTarget('station')}
        />
        <LookupSelect
          label="Buildings"
          value={building}
          onChange={setBuilding}
          options={buildingOptions}
          onPreview={() => openTarget('building', true)}
          onOpen={() => openTarget('building')}
        />
        <LookupSelect
          label="Meters"
          value={meter}
          onChange={setMeter}
          options={meterOptions}
          onPreview={() => openTarget('meter', true)}
          onOpen={() => openTarget('meter')}
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-white/70">
        <Sparkles className="h-4 w-4 text-emerald-300" />
        <p>Use “Preview” to load the visualization below, or “Open” to jump into the full page.</p>
      </div>
    </div>
  );
}

function LookupSelect({
  label,
  value,
  onChange,
  options,
  onPreview,
  onOpen,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (next: string) => void;
  onPreview: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="flex gap-1">
          <button
            onClick={onPreview}
            className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            Preview
          </button>
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
          >
            Open
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-black/40 ring-1 ring-white/5">
        <select
          value={value}
          onChange={(evt) => onChange(evt.target.value)}
          className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
        >
          {options.map((opt, idx) => (
            <option
              key={`${opt.id}-${idx}`}
              value={opt.id}
              className="bg-slate-950 text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
