'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/auth';

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

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isDemo: user?.role === 'demo',
    isAdmin: user?.role === 'admin',
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
