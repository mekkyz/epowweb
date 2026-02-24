'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { checkWebGLSupport } from '@/lib/webgl';

/**
 * Checks WebGL support with a small delay to ensure browser readiness.
 * Returns `null` while checking, `true`/`false` once resolved.
 */
export function useWebGLCheck() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSupported(checkWebGLSupport());
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return supported;
}

/**
 * Manages fullscreen state for a given container element ID.
 */
export function useFullscreen(containerId: string) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggle = useCallback(async () => {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  }, [containerId]);

  return { isFullscreen, toggleFullscreen: toggle };
}

/**
 * Adds ALT+drag rotation support to a MapLibre map instance.
 * Returns a ref callback to pass to react-map-gl's `ref` prop.
 * Cleans up document-level listeners when the ref is set to null.
 */
export function useAltDragRotation() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    // Clean up previous listeners
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!ref) return;
    const map = ref.getMap();
    const canvas = map.getCanvasContainer();
    let dragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.altKey && e.button === 0) {
        dragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      map.setBearing(map.getBearing() + dx * 0.5);
      map.setPitch(Math.max(0, Math.min(60, map.getPitch() - dy * 0.5)));
    };

    const onMouseUp = () => {
      if (dragging) {
        dragging = false;
        canvas.style.cursor = '';
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    cleanupRef.current = () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    return map;
  }, []);
}

/**
 * Suppresses missing sprite image warnings from OpenFreeMap tiles.
 * Returns a ref callback to pass to react-map-gl's `ref` prop.
 */
export function useSuppressMissingImages() {
  return useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (!ref) return;
    const map = ref.getMap();
    map.on('styleimagemissing', (e) => {
      const emptyImage = { width: 1, height: 1, data: new Uint8Array(4) };
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, emptyImage);
      }
    });
    return map;
  }, []);
}
