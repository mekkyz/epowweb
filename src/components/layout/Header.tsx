'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Menu, X, Home, Map, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import clsx from 'clsx';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/#map', label: 'Campus Map', icon: Map },
  { href: '/heatmap', label: 'Heatmap', icon: Radio },
];

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={clsx(
        'relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200',
        'bg-surface hover:bg-surface-hover',
        'text-foreground-secondary hover:text-foreground',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
      aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
    >
      {!mounted ? (
        <div className="h-5 w-5" />
      ) : (
        <>
          <Sun
            className={clsx(
              'absolute h-5 w-5 transition-all duration-300',
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            )}
          />
          <Moon
            className={clsx(
              'absolute h-5 w-5 transition-all duration-300',
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            )}
          />
        </>
      )}
    </button>
  );
}

function HeaderContent() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isEmbedded = useMemo(() => {
    const embedFlag = search?.get('embed') === '1';
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    return embedFlag || inIframe;
  }, [search]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (path === '/' && pathname === '/') {
        e.preventDefault();
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [pathname]);

  if (isEmbedded) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold leading-tight text-foreground">
                ePowWeb
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary">
                KIT Campus North Power Grid Web-Service
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-surface-hover text-foreground shadow-sm'
                      : 'text-foreground-secondary hover:bg-surface hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <div className="ml-2 border-l border-border pl-3">
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href));
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      handleNavClick(e, link.href);
                      setMobileMenuOpen(false);
                    }}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-surface-hover text-foreground'
                        : 'text-foreground-secondary hover:bg-surface hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}
