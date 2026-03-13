"use client";

import HeatmapExplorer from "@/components/HeatmapExplorer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import PageHeader from "@/components/layout/PageHeader";

export default function HeatmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader label="Heatmap View" title="KIT-CN 20 kV Power Grid" />
      <ErrorBoundary>
        <HeatmapExplorer />
      </ErrorBoundary>
    </div>
  );
}
