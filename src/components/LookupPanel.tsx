'use client';

import { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  buildingOptions,
  meterOptions,
  stationOptions,
} from '@/config/grid';
import { Button, Select } from '@/components/ui';
import type { EntityType } from '@/lib/constants';

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
  const selectOptions = options.map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpen}
            iconRight={<ArrowUpRight className="h-3 w-3" />}
          >
            Open
          </Button>
        </div>
      </div>
      <Select
        options={selectOptions}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="sm"
        aria-label={`Select ${label.toLowerCase()}`}
      />
    </div>
  );
}
