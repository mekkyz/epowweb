'use client';

import { useEffect } from 'react';

/**
 * Suppresses WebGL-related errors that can occur when:
 * - Browser WebGL context is not ready during resize
 * - GPU drivers have transient issues
 * - Browser tab is in background/hibernated
 * - MapLibre/luma.gl tries to access WebGL before context is ready
 *
 * These errors are non-fatal and the maps will typically recover on next render cycle.
 */
export function WebGLErrorSuppressor() {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const suppressedPatterns = [
      'maxTextureDimension2D',
      'WebGL context lost',
      'CONTEXT_LOST_WEBGL',
      'Cannot read properties of undefined',
      'Failed to initialize WebGL',
      'WebGL2RenderingContext',
      'getContext',
      'luma.gl',
      '@luma.gl',
    ];

    const shouldSuppress = (message: string): boolean => {
      return suppressedPatterns.some(pattern => message.includes(pattern));
    };

    console.error = (...args: unknown[]) => {
      const message = args.map(a => String(a)).join(' ');
      if (shouldSuppress(message)) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map(a => String(a)).join(' ');
      if (shouldSuppress(message)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Handle synchronous errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (shouldSuppress(message)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    // Handle unhandled promise rejections (async WebGL errors)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason) || '';
      if (shouldSuppress(message)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  return null;
}
