'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Cloud, ImageIcon, Wind, Sun, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Badge, ToggleGroup, Button } from '@/components/ui';

type Layer = 'radiation' | 'temperature' | 'wind';

const titles: Record<Layer, string> = {
  radiation: 'Solar Radiation (10 min intervals)',
  temperature: 'Air Temperature',
  wind: 'Wind Speed & Direction',
};

const descriptions: Record<Layer, string> = {
  radiation: 'Global horizontal irradiance across the European region',
  temperature: 'Surface air temperature measurements at 2m height',
  wind: 'Wind speed and direction from atmospheric models',
};

const layerIcons: Record<Layer, ReactNode> = {
  radiation: <Sun className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
  temperature: <Cloud className="h-4 w-4" />,
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
      <span className="flex items-center gap-1.5">
        {layerIcons[l]}
        {l.charAt(0).toUpperCase() + l.slice(1)}
      </span>
    ),
  }));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-emerald-400/10 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20">
              <Cloud className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-xs font-medium uppercase tracking-widest text-sky-400">
              Anemos Weather Data
            </p>
          </div>
          <p className="text-xl font-semibold text-foreground">
            EU 20km Atmospheric Layers
          </p>
          <p className="max-w-lg text-sm text-foreground-secondary">
            High-resolution atmospheric data covering the European region.
            View solar radiation, temperature, and wind patterns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" icon={<ImageIcon className="h-4 w-4" />}>
            Static Previews
          </Badge>
          <Button
            variant="outline"
            size="sm"
            iconRight={<ExternalLink className="h-3.5 w-3.5" />}
          >
            Full Explorer
          </Button>
        </div>
      </div>

      <div className="border-t border-border p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <ToggleGroup
            options={toggleOptions}
            value={layer}
            onChange={(val) => setLayer(val)}
            size="md"
          />
          <p className="text-sm text-foreground-secondary">{descriptions[layer]}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              {layerIcons[layer]}
              <span className="text-sm font-medium text-foreground">{titles[layer]}</span>
            </div>
            <Badge variant="default" size="sm">Preview</Badge>
          </div>
          <div className="relative aspect-[16/9] min-h-[280px]">
            <Image
              src={previewSrc}
              alt={titles[layer]}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
