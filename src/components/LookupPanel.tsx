'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Sparkles, Building, Gauge, Radio } from 'lucide-react';
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
  const router = useRouter();
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
    router.push(target);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <LookupSelect
          label="Stations"
          icon={<Radio className="h-4 w-4 text-emerald-400" />}
          value={station}
          onChange={setStation}
          options={stationOptions}
          onPreview={() => openTarget('station', true)}
          onOpen={() => openTarget('station')}
        />
        <LookupSelect
          label="Buildings"
          icon={<Building className="h-4 w-4 text-blue-400" />}
          value={building}
          onChange={setBuilding}
          options={buildingOptions}
          onPreview={() => openTarget('building', true)}
          onOpen={() => openTarget('building')}
        />
        <LookupSelect
          label="Meters"
          icon={<Gauge className="h-4 w-4 text-amber-400" />}
          value={meter}
          onChange={setMeter}
          options={meterOptions}
          onPreview={() => openTarget('meter', true)}
          onOpen={() => openTarget('meter')}
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-panel border border-border px-4 py-3 text-sm text-foreground-secondary">
        <Sparkles className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <p>Click <strong className="text-foreground">Preview</strong> for visualization below, or <strong className="text-foreground">Open</strong> to view in a full page.</p>
      </div>
    </div>
  );
}

function LookupSelect({
  label,
  icon,
  value,
  onChange,
  options,
  onPreview,
  onOpen,
}: {
  label: string;
  icon: React.ReactNode;
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
    <div className="rounded-xl border border-border bg-panel p-4 shadow-sm transition-all hover:border-border-strong">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-foreground">{label}</p>
        </div>
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
