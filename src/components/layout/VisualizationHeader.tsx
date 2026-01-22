'use client';

import PageHeader from '@/components/layout/PageHeader';

interface VisualizationHeaderProps {
  type: string;
  title: string;
  subtitle?: string;
}

export default function VisualizationHeader({ type, title, subtitle }: VisualizationHeaderProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      label={`${label} Visualization`}
    />
  );
}
