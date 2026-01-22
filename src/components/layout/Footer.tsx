'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

function FooterContent() {
  const currentYear = new Date().getFullYear();
  const search = useSearchParams();
  const isEmbedded = useMemo(() => {
    const embedFlag = search?.get('embed') === '1';
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    return embedFlag || inIframe;
  }, [search]);

  if (isEmbedded) return null;

  return (
    <footer className="border-t border-border bg-background">
      <div className="p-4 text-center">
        <p className="text-xs text-foreground-secondary">
          © {currentYear}&nbsp;
          <a
            href="https://www.iai.kit.edu/gruppen_4104.php"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            Energiesystemanalyse (ESA)
          </a>
          ,&nbsp;
          <a
            href="https://www.iai.kit.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            Institut für Automation und angewandte Informatik (IAI)
          </a>
          ,&nbsp;
          <a
            href="https://www.kit.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            Karlsruhe Institute of Technology (KIT)
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Footer() {
  return (
    <Suspense fallback={null}>
      <FooterContent />
    </Suspense>
  );
}
