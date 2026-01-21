import HeatmapExplorer from '@/components/HeatmapExplorer';
import Link from 'next/link';
import { ArrowLeft, Radio } from 'lucide-react';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function HeatmapPage() {
  return (
    <div className="min-h-screen bg-[#050b18] px-4 py-8 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Badge variant="default" icon={<Radio className="h-4 w-4 text-emerald-300" />}>
            HEATMAP
          </Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Power Heatmap</h1>
        </div>
        <HeatmapExplorer />
      </div>
    </div>
  );
}
