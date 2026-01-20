'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Cloud, ImageIcon, Wind } from 'lucide-react';
import Image from 'next/image';

type Layer = 'radiation' | 'temperature' | 'wind';

const titles: Record<Layer, string> = {
  radiation: 'Solar radiation (10 min)',
  temperature: 'Air temperature',
  wind: 'Wind speed',
};

export default function AnemosPanel() {
  const [layer, setLayer] = useState<Layer>('radiation');

  const previewSrc = useMemo(
    () => `/anemos/${layer}.png`,
    [layer],
  );

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
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/30">
            <ImageIcon className="h-4 w-4" />
            Offline previews
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 p-5 md:flex-row">
        <div className="flex h-12 flex-wrap gap-2">
          {(['radiation', 'wind', 'temperature'] as Layer[]).map((option) => (
            <button
              key={option}
              onClick={() => setLayer(option)}
              className={clsx(
                'rounded-full px-3 py-2 text-sm font-semibold capitalize transition',
                layer === option
                  ? 'bg-white text-black shadow-lg shadow-black/40'
                  : 'bg-white/10 text-white hover:bg-white/15',
              )}
            >
              {option === 'wind' ? <Wind className="mr-2 inline h-4 w-4" /> : null}
              {option === 'temperature' ? (
                <Cloud className="mr-2 inline h-4 w-4" />
              ) : null}
              {option}
            </button>
          ))}
        </div>
        <div className="min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-inner shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-sm text-white/70">
            <span>{titles[layer]}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-white">
              Preview
            </span>
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
