'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Cloud, ImageIcon, Wind } from 'lucide-react';
import Image from 'next/image';
import { Badge, ToggleGroup } from '@/components/ui';

type Layer = 'radiation' | 'temperature' | 'wind';

const titles: Record<Layer, string> = {
  radiation: 'Solar radiation (10 min)',
  temperature: 'Air temperature',
  wind: 'Wind speed',
};

const layerIcons: Record<Layer, ReactNode> = {
  radiation: null,
  wind: <Wind className="mr-1 inline h-3 w-3" />,
  temperature: <Cloud className="mr-1 inline h-3 w-3" />,
};

const layerLabels: Layer[] = ['radiation', 'wind', 'temperature'];

export default function AnemosPanel() {
  const [layer, setLayer] = useState<Layer>('radiation');

  const previewSrc = useMemo(
    () => `/anemos/${layer}.png`,
    [layer],
  );

  const toggleOptions = layerLabels.map((l) => ({
    value: l,
    label: (
      <>
        {layerIcons[l]}
        {l.charAt(0).toUpperCase() + l.slice(1)}
      </>
    ),
  }));

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-emerald-400/10 shadow-xl shadow-sky-500/10 backdrop-blur">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">
            Anemos weather data
          </p>
          <p className="text-xl font-semibold text-white">
            EU 20km atmospheric layers
          </p>
          <p className="text-white/70">
            Rapid preview of the radar/temperature/wind datasets. Swap
            layers below or open the full explorer.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" icon={<ImageIcon className="h-4 w-4" />}>
            Offline previews
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 p-5 md:flex-row">
        <div className="flex h-12 flex-wrap gap-2">
          <ToggleGroup
            options={toggleOptions}
            value={layer}
            onChange={(val) => setLayer(val)}
            size="md"
          />
        </div>
        <div className="min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-inner shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-sm text-white/70">
            <span>{titles[layer]}</span>
            <Badge variant="default" size="sm">Preview</Badge>
          </div>
          <Image
            src={previewSrc}
            alt={titles[layer]}
            width={1200}
            height={720}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
