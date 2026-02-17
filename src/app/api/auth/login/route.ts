import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getOidcAuthUrl,
  STATE_COOKIE_NAME,
  FROM_COOKIE_NAME,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from') || '/';
  const state = crypto.randomBytes(32).toString('hex');

  const response = NextResponse.redirect(getOidcAuthUrl(state));

  response.cookies.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  });

  response.cookies.set(FROM_COOKIE_NAME, from, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  return response;
}
