'use client';

import { useMemo, useState } from 'react';
import LookupPanel from '@/components/LookupPanel';
import TimeSeriesPreview from '@/components/TimeSeriesPreview';
import { meterOptions } from '@/data/grid';

export default function LiveDataSection() {
  const defaultUrl = useMemo(
    () => (meterOptions[0]?.id ? `/visualization/meter/${meterOptions[0].id}` : undefined),
    [],
  );
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(defaultUrl);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr,1.9fr]">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm">
        <LookupPanel onPreview={setPreviewUrl} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm">
        <TimeSeriesPreview url={previewUrl} />
      </div>
    </div>
  );
}
