import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, OIDC_ENDPOINTS } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const authLogger = createLogger('Auth');

export async function POST() {
  authLogger.info('User logged out');

  const callbackUrl = process.env.AUTH_CALLBACK_URL || 'http://localhost:3000/api/auth/callback';
  const baseUrl = callbackUrl.replace('/api/auth/callback', '');
  const logoutRedirect = `${baseUrl}/login`;

  const oidcLogoutUrl = `${OIDC_ENDPOINTS.logout}?${new URLSearchParams({
    client_id: process.env.AUTH_OIDC_CLIENT_ID || '',
    post_logout_redirect_uri: logoutRedirect,
  }).toString()}`;

  const response = NextResponse.json({ success: true, logoutUrl: oidcLogoutUrl });

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
