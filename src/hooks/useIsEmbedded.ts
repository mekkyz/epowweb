'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

/** Returns true when the page is rendered inside an iframe or has `?embed=1`. */
export function useIsEmbedded() {
  const search = useSearchParams();
  return useMemo(() => {
    const embedFlag = search?.get('embed') === '1';
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    return embedFlag || inIframe;
  }, [search]);
}
