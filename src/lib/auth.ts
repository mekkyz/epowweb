import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const authLogger = createLogger('Auth');

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'demo' | 'full';

export interface SessionPayload {
  username: string;
  role: UserRole;
  exp: number;
}

export interface AuthUser {
  username: string;
  role: UserRole;
}

// =============================================================================
// Constants
// =============================================================================

const SESSION_SECRET =
  process.env.AUTH_SECRET || 'smdt-dev-secret-change-in-production';
export const SESSION_COOKIE_NAME = 'smdt-session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

// =============================================================================
// User store (loaded from env)
// =============================================================================

interface StoredUser {
  passwordHash: string;
  role: UserRole;
}

function buildUserStore(): Record<string, StoredUser> {
  const store: Record<string, StoredUser> = {};

  const demoUser = process.env.AUTH_USER_DEMO || 'cakmak-demo';
  const demoPass = process.env.AUTH_PASS_DEMO || 'Passwort1';
  const fullUser = process.env.AUTH_USER_FULL || 'cakmak';
  const fullPass = process.env.AUTH_PASS_FULL || 'Passwort1';

  store[demoUser] = {
    passwordHash: crypto.createHash('sha256').update(demoPass).digest('hex'),
    role: 'demo',
  };
  store[fullUser] = {
    passwordHash: crypto.createHash('sha256').update(fullPass).digest('hex'),
    role: 'full',
  };

  return store;
}

const AUTH_USERS = buildUserStore();

// =============================================================================
// Credential verification
// =============================================================================

export function verifyCredentials(
  username: string,
  password: string
): AuthUser | null {
  const user = AUTH_USERS[username];
  if (!user) return null;

  const inputHash = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');

  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(user.passwordHash, 'hex');

  if (
    inputBuf.length !== storedBuf.length ||
    !crypto.timingSafeEqual(inputBuf, storedBuf)
  ) {
    return null;
  }

  return { username, role: user.role };
}

// =============================================================================
// Session token (HMAC-SHA256 signed JSON)
// =============================================================================

export function createSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      authLogger.debug('Session expired', { username: payload.username });
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// =============================================================================
// Session helper (reads cookie)
// =============================================================================

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
