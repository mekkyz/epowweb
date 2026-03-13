"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { useIsEmbedded } from "@/hooks/useIsEmbedded";

function FooterContent() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const isEmbedded = useIsEmbedded();

  if (isEmbedded || pathname === "/login") return null;

  return (
    <footer className="border-border bg-background border-t">
      <div className="p-4 text-center">
        <p className="text-foreground-secondary text-xs">
          © {currentYear}&nbsp;
          <a
            href="https://www.iai.kit.edu/gruppen_4104.php"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Energiesystemanalyse (ESA)
          </a>
          ,&nbsp;
          <a
            href="https://www.iai.kit.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Institut für Automation und angewandte Informatik (IAI)
          </a>
          ,&nbsp;
          <a
            href="https://www.kit.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
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
