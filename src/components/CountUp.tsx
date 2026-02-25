'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** SSR-safe check for prefers-reduced-motion */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false, // SSR snapshot
  );
}

/**
 * Minimal count-up animation for stat numbers.
 * Animates from 0 → `end` over `duration` ms using requestAnimationFrame.
 * Falls back to the static value immediately if the user prefers reduced motion.
 */
export default function CountUp({
  end,
  duration = 1200,
  className,
}: {
  end: number;
  duration?: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(reducedMotion ? end : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );

    const el = ref.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [end, duration, reducedMotion]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
