'use client';

import { Component, ReactNode } from 'react';
import { Map as MapIcon, Box } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackIcon?: 'map' | 'box';
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Log WebGL-related errors silently
    if (process.env.NODE_ENV === 'development') {
      console.warn('Map rendering error:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      const Icon = this.props.fallbackIcon === 'box' ? Box : MapIcon;
      return (
        <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel to-surface">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
              <Icon className="h-8 w-8 text-foreground-tertiary" />
            </div>
            <p className="text-sm font-medium text-foreground-secondary">
              {this.props.title || 'Map Unavailable'}
            </p>
            <p className="max-w-xs text-xs text-foreground-tertiary">
              {this.props.description || 'Unable to render the map. Try refreshing the page or using a different browser.'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
