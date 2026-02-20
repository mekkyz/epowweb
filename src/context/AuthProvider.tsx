'use client';

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/auth';
import { useRolePreview } from '@/components/RolePreview';

export interface AuthUser {
  username: string;
  role: UserRole;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  user: AuthUser | null;
}

export function AuthProvider({ children, user }: AuthProviderProps) {
  const router = useRouter();
  const previewRole = useRolePreview();

  const logout = useCallback(async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const body = await res.json();

    // Redirect to KIT OIDC logout to end SSO session
    if (body.logoutUrl) {
      window.location.href = body.logoutUrl;
    } else {
      router.push('/login');
      router.refresh();
    }
  }, [router]);

  const effectiveUser = useMemo<AuthUser | null>(() => {
    // In development, allow role preview to override the role
    if (previewRole) {
      const base = user ?? { username: 'preview', name: 'Preview User' };
      return { ...base, role: previewRole };
    }
    return user;
  }, [user, previewRole]);

  const value: AuthContextValue = {
    user: effectiveUser,
    isAuthenticated: !!effectiveUser,
    isDemo: effectiveUser?.role === 'demo',
    isAdmin: effectiveUser?.role === 'admin',
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
