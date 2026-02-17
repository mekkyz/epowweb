import { NextRequest } from 'next/server';
import {
  verifyCredentials,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '@/lib/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants';

const authLogger = createLogger('Auth');

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid request body');
  }

  const { username, password } = body;

  if (!username || !password) {
    return badRequestResponse('Username and password are required');
  }

  const user = verifyCredentials(username, password);
  if (!user) {
    authLogger.warn('Failed login attempt', { username });
    return errorResponse('Invalid credentials', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const token = createSessionToken(user);
  authLogger.info('User logged in', { username: user.username, role: user.role });

  const response = successResponse({ username: user.username, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return response;
}
