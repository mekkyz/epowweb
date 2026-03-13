"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Radio, Menu, X, Home, Sun, Moon, LogOut, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { useAuth } from "@/context/AuthProvider";
import { useIsEmbedded } from "@/hooks/useIsEmbedded";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/heatmap", label: "Heatmap", icon: Radio },
];

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={clsx(
        "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all",
        "text-foreground-secondary hover:bg-surface hover:text-foreground",
        "focus-visible:ring-accent focus-visible:ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
      aria-label={
        mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"
      }
    >
      {!mounted ? (
        <div className="h-5 w-5" />
      ) : (
        <>
          <Sun
            className={clsx(
              "absolute h-5 w-5 transition-all duration-300",
              isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
            )}
          />
          <Moon
            className={clsx(
              "absolute h-5 w-5 transition-all duration-300",
              isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0",
            )}
          />
        </>
      )}
    </button>
  );
}

function HeaderContent() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isEmbedded = useIsEmbedded();

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.includes("#")) {
        const [path, hash] = href.split("#");

        if (path === "/" && pathname === "/") {
          e.preventDefault();
          const element = document.getElementById(hash);

          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    },
    [pathname],
  );

  // Prefetch heatmap data on hover
  const handleMouseEnter = useCallback(
    (href: string) => {
      if (href === "/heatmap" && pathname !== "/heatmap") {
        fetch("/api/heatmap/init", { priority: "low" } as RequestInit);
      }
    },
    [pathname],
  );

  if (isEmbedded || pathname === "/login") return null;

  return (
    <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex flex-col">
              <span className="font-display text-foreground text-lg leading-tight font-semibold">
                <span className="inline-block -skew-x-12 text-[#009682]">e</span>PowMon
              </span>
              <span className="text-foreground-tertiary text-[10px] font-medium tracking-wider uppercase">
                KIT Campus North Power Grid Monitoring
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <div className="border-border flex h-10 items-center gap-0.5 rounded-xl border px-1.5">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    onMouseEnter={() => handleMouseEnter(link.href)}
                    className={clsx(
                      "flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-surface text-foreground"
                        : "text-foreground-secondary hover:bg-surface-hover/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="border-border flex h-10 items-center gap-0.5 rounded-xl border px-1.5">
              <ThemeToggle />
              {user && (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      title="Admin panel"
                      className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Link>
                  )}
                  <div className="bg-border mx-0.5 h-5 w-px" />
                  <span className="text-foreground-secondary px-1.5 text-xs font-medium">
                    {user.name || user.username}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign out"
                    className="text-foreground-secondary flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            {user && (
              <button
                type="button"
                onClick={logout}
                className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-all"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
            <ThemeToggle />
            <button
              type="button"
              className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-border border-t py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
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
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-surface-hover text-foreground"
                        : "text-foreground-secondary hover:bg-surface hover:text-foreground",
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
