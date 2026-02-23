'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ChartMouseEvent = {
  activeLabel?: string | number | null;
  [key: string]: unknown;
};

interface UseChartZoomOptions<T extends { start: string }> {
  data: T[];
  resetKey?: unknown;
}

export function useChartZoom<T extends { start: string }>({ data, resetKey }: UseChartZoomOptions<T>) {
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const isZoomed = zoomLeft !== null && zoomRight !== null;

  // ── visible slice ──────────────────────────────────────────────
  const visibleData = useMemo(() => {
    if (zoomLeft === null || zoomRight === null) return data;
    return data.slice(zoomLeft, zoomRight + 1);
  }, [data, zoomLeft, zoomRight]);

  const zoomPercentage = useMemo(() => {
    if (!isZoomed || data.length === 0) return 100;
    return Math.round((visibleData.length / data.length) * 100);
  }, [isZoomed, visibleData.length, data.length]);

  // ── reset ──────────────────────────────────────────────────────
  const resetZoom = useCallback(() => {
    setZoomLeft(null);
    setZoomRight(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- resetting derived state when key changes */
  useEffect(() => {
    setZoomLeft(null);
    setZoomRight(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [resetKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── zoom by factor ─────────────────────────────────────────────
  const zoomBy = useCallback(
    (factor: number, centerRatio = 0.5) => {
      if (data.length < 3) return;

      const currentLeft = zoomLeft ?? 0;
      const currentRight = zoomRight ?? data.length - 1;
      const currentRange = currentRight - currentLeft;
      const centerIndex = currentLeft + centerRatio * currentRange;

      const zoomFactor = factor > 0 ? 0.7 : 1.4;
      const newRange = Math.max(10, Math.min(data.length, currentRange * zoomFactor));

      let newLeft = Math.round(centerIndex - centerRatio * newRange);
      let newRight = Math.round(centerIndex + (1 - centerRatio) * newRange);

      if (newLeft < 0) {
        newRight = Math.min(data.length - 1, newRight - newLeft);
        newLeft = 0;
      }
      if (newRight >= data.length) {
        newLeft = Math.max(0, newLeft - (newRight - data.length + 1));
        newRight = data.length - 1;
      }

      if (newLeft === 0 && newRight === data.length - 1) {
        resetZoom();
      } else {
        setZoomLeft(newLeft);
        setZoomRight(newRight);
      }
    },
    [data.length, zoomLeft, zoomRight, resetZoom],
  );

  // ── wheel → zoom ──────────────────────────────────────────────
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || data.length < 3) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width - 70;
      const relativeX = Math.max(0, Math.min(1, (mouseX - 60) / chartWidth));

      zoomBy(e.deltaY < 0 ? 1 : -1, relativeX);
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelEvent);
  }, [data.length, zoomBy]);

  // ── pan (shift+drag / middle-click) ────────────────────────────
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      if (e.button === 1 || e.shiftKey) {
        e.preventDefault();
        setIsPanning(true);
        setPanStartX(e.clientX);
      }
    },
    [isZoomed],
  );

  const handlePanMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || panStartX === null || !isZoomed) return;

      const container = chartContainerRef.current;
      if (!container) return;

      const deltaX = e.clientX - panStartX;
      const chartWidth = container.getBoundingClientRect().width - 70;
      const currentRange = (zoomRight ?? 0) - (zoomLeft ?? 0);
      const panAmount = Math.round((deltaX / chartWidth) * currentRange * -1);

      if (Math.abs(panAmount) < 1) return;

      let newLeft = (zoomLeft ?? 0) + panAmount;
      let newRight = (zoomRight ?? 0) + panAmount;

      if (newLeft < 0) {
        newRight -= newLeft;
        newLeft = 0;
      }
      if (newRight >= data.length) {
        newLeft -= newRight - data.length + 1;
        newRight = data.length - 1;
      }

      setZoomLeft(Math.max(0, newLeft));
      setZoomRight(Math.min(data.length - 1, newRight));
      setPanStartX(e.clientX);
    },
    [isPanning, panStartX, isZoomed, zoomLeft, zoomRight, data.length],
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStartX(null);
  }, []);

  // ── drag-to-select ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: ChartMouseEvent) => {
    if (e?.activeLabel !== undefined) {
      const label = String(e.activeLabel);
      setRefAreaLeft(label);
      setRefAreaRight(label);
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: ChartMouseEvent) => {
      if (isDragging && e?.activeLabel !== undefined) {
        setRefAreaRight(String(e.activeLabel));
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !refAreaLeft || !refAreaRight) {
      setIsDragging(false);
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    setIsDragging(false);

    const leftIdx = data.findIndex((d) => d.start === refAreaLeft);
    const rightIdx = data.findIndex((d) => d.start === refAreaRight);

    if (leftIdx === -1 || rightIdx === -1) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const minIdx = Math.min(leftIdx, rightIdx);
    const maxIdx = Math.max(leftIdx, rightIdx);

    if (maxIdx - minIdx >= 2) {
      setZoomLeft(minIdx);
      setZoomRight(maxIdx);
    }

    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [isDragging, refAreaLeft, refAreaRight, data]);

  const handleDoubleClick = useCallback(() => {
    if (isZoomed) resetZoom();
  }, [isZoomed, resetZoom]);

  return {
    chartContainerRef,
    visibleData,
    isZoomed,
    zoomPercentage,
    isDragging,
    isPanning,
    refAreaLeft,
    refAreaRight,
    zoomBy,
    resetZoom,
    // container event handlers (for the wrapper div)
    containerHandlers: {
      onDoubleClick: handleDoubleClick,
      onMouseDown: handlePanStart,
      onMouseMove: handlePanMove,
      onMouseUp: handlePanEnd,
      onMouseLeave: handlePanEnd,
    },
    // chart event handlers (for <ComposedChart>)
    chartHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
  };
}
