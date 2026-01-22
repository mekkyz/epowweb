'use client';

import { useMemo, useState } from 'react';
import LookupPanel from '@/components/LookupPanel';
import TimeSeriesPreview from '@/components/TimeSeriesPreview';
import { meterOptions, stationOptions, buildingOptions } from '@/config/grid';

export default function LiveDataSection() {
  const defaultUrl = useMemo(
    () => (meterOptions[0]?.id ? `/visualization/meter/${meterOptions[0].id}` : undefined),
    [],
  );
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(defaultUrl);

  // Extract title from URL
  const previewTitle = useMemo(() => {
    if (!previewUrl) return undefined;
    const match = previewUrl.match(/\/visualization\/(\w+)\/(.+)/);
    if (!match) return undefined;
    const [, type, id] = match;
    
    if (type === 'meter') {
      const meter = meterOptions.find(m => m.id === id);
      return meter?.label || id;
    }
    if (type === 'station') {
      const station = stationOptions.find(s => s.id === id);
      return station?.label || id;
    }
    if (type === 'building') {
      const building = buildingOptions.find(b => b.id === id);
      return building?.label || id;
    }
    return id;
  }, [previewUrl]);

  return (
    <div className="space-y-6">
      <LookupPanel onPreview={setPreviewUrl} />
      <TimeSeriesPreview url={previewUrl} title={previewTitle} />
    </div>
  );
}
