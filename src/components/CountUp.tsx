'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Minimal count-up animation for stat numbers.
 * Animates from 0 → `end` over `duration` ms using requestAnimationFrame.
 * Falls back to the static value if the user prefers reduced motion.
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
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [value, setValue] = useState(prefersReduced ? end : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReduced) return;

    function animate() {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    const el = ref.current;
    if (!el) return;

    // If already visible in viewport, animate immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      animate();
      return;
    }

    // Otherwise wait until scrolled into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
