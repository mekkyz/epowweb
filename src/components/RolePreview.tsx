'use client';

import { useState, useSyncExternalStore } from 'react';
import { Eye, EyeOff, Shield, ShieldCheck, User } from 'lucide-react';
import clsx from 'clsx';
import type { UserRole } from '@/lib/auth';

const STORAGE_KEY = 'smdt-role-preview';
const EVENT_NAME = 'role-preview-change';

const roles: { value: UserRole | 'off'; label: string; icon: typeof User; color: string }[] = [
  { value: 'off',   label: 'Off',   icon: EyeOff,      color: 'text-foreground-tertiary' },
  { value: 'demo',  label: 'Demo',  icon: User,         color: 'text-blue-400' },
  { value: 'full',  label: 'Full',  icon: Shield,       color: 'text-emerald-400' },
  { value: 'admin', label: 'Admin', icon: ShieldCheck,   color: 'text-amber-400' },
];

export type PreviewRole = UserRole | null;

function parseStored(val: string | null): PreviewRole {
  if (val === 'demo' || val === 'full' || val === 'admin') return val;
  return null;
}

function subscribeToPreview(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}

function getPreviewSnapshot(): PreviewRole {
  return parseStored(localStorage.getItem(STORAGE_KEY));
}

function getPreviewServerSnapshot(): PreviewRole {
  return null;
}

export function useRolePreview(): PreviewRole {
  return useSyncExternalStore(subscribeToPreview, getPreviewSnapshot, getPreviewServerSnapshot);
}

export default function RolePreview() {
  const [selected, setSelected] = useState<UserRole | 'off'>(() => {
    if (typeof window === 'undefined') return 'off';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'demo' || stored === 'full' || stored === 'admin') return stored;
    return 'off';
  });
  const [collapsed, setCollapsed] = useState(true);

  const handleSelect = (value: UserRole | 'off') => {
    setSelected(value);
    if (value === 'off') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
    window.dispatchEvent(new Event('role-preview-change'));
  };

  const activeRole = roles.find((r) => r.value === selected)!;
  const ActiveIcon = activeRole.icon;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {!collapsed && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border bg-panel p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
            Preview as role
          </p>
          <div className="flex gap-1">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = selected === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleSelect(r.value)}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-foreground-secondary hover:bg-surface-hover/50 hover:text-foreground'
                  )}
                >
                  <Icon className={clsx('h-3.5 w-3.5', isActive && r.color)} />
                  {r.label}
                </button>
              );
            })}
          </div>
          {selected !== 'off' && (
            <p className="mt-2 text-[10px] text-foreground-tertiary">
              UI will behave as a <strong>{selected}</strong> user. API calls are unaffected.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={clsx(
          'flex h-10 items-center gap-2 rounded-full border px-3 shadow-lg transition-all',
          selected !== 'off'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            : 'border-border bg-panel text-foreground-secondary hover:bg-surface'
        )}
        title="Role preview switcher"
      >
        <ActiveIcon className={clsx('h-4 w-4', activeRole.color)} />
        <span className="text-xs font-medium">
          {selected === 'off' ? 'Preview' : `As ${activeRole.label}`}
        </span>
        {collapsed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
