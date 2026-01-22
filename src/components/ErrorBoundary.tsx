'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-foreground-secondary mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-friendly wrapper for using ErrorBoundary with a render prop pattern
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallbackRender?: (props: { error: Error | null; reset: () => void }) => ReactNode;
}

export function ErrorBoundaryWrapper({ children, fallbackRender }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundaryInner fallbackRender={fallbackRender}>
      {children}
    </ErrorBoundaryInner>
  );
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryWrapperProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.props.fallbackRender) {
      return this.props.fallbackRender({
        error: this.state.error,
        reset: this.handleReset,
      });
    }

    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-foreground-secondary mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
