import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  parseIdToken,
  createSessionToken,
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  FROM_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '@/lib/auth';
import { getUserRole } from '@/services/auth-store';
import { createLogger } from '@/lib/logger';

const authLogger = createLogger('Auth');

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get(STATE_COOKIE_NAME)?.value;
  const from = request.cookies.get(FROM_COOKIE_NAME)?.value || '/';

  // Validate state to prevent CSRF
  if (!code || !state || state !== storedState) {
    authLogger.warn('Invalid OIDC callback', { hasCode: !!code, stateMatch: state === storedState });
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const claims = parseIdToken(tokens.id_token);
    const kuerzel = claims.preferred_username;
    const role = getUserRole(kuerzel);

    authLogger.info('OIDC login successful', { kuerzel, role, name: claims.name });

    const sessionToken = createSessionToken({
      username: kuerzel,
      role,
      name: claims.name,
    });

    const response = NextResponse.redirect(new URL(from, request.url));

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    // Clear OIDC state cookies
    response.cookies.set(STATE_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    response.cookies.set(FROM_COOKIE_NAME, '', { maxAge: 0, path: '/' });

    return response;
  } catch (error) {
    authLogger.error('OIDC callback failed', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
