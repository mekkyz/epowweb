import { cookies } from "next/headers";
import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const authLogger = createLogger("Auth");

// =============================================================================
// Types
// =============================================================================

export type UserRole = "demo" | "full" | "admin";

export interface SessionPayload {
  username: string;
  role: UserRole;
  name?: string;
  email?: string;
  exp: number;
}

export interface AuthUser {
  username: string;
  role: UserRole;
  name?: string;
  email?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SESSION_SECRET = process.env.AUTH_SECRET || "smdt-dev-secret-change-in-production";

export const SESSION_COOKIE_NAME = "smdt-session";
export const STATE_COOKIE_NAME = "smdt-oidc-state";
export const FROM_COOKIE_NAME = "smdt-oidc-from";
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

// =============================================================================
// OIDC Configuration
// =============================================================================

const OIDC_ISSUER = process.env.AUTH_OIDC_ISSUER || "https://oidc.scc.kit.edu/auth/realms/kit";
const OIDC_CLIENT_ID = process.env.AUTH_OIDC_CLIENT_ID || "";
const OIDC_CLIENT_SECRET = process.env.AUTH_OIDC_CLIENT_SECRET || "";
const OIDC_CALLBACK_URL =
  process.env.AUTH_CALLBACK_URL || "http://localhost:3000/api/auth/callback";

export const OIDC_ENDPOINTS = {
  authorize: `${OIDC_ISSUER}/protocol/openid-connect/auth`,
  token: `${OIDC_ISSUER}/protocol/openid-connect/token`,
  logout: `${OIDC_ISSUER}/protocol/openid-connect/logout`,
};

// =============================================================================
// OIDC Helpers
// =============================================================================

export function getOidcAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: OIDC_CALLBACK_URL,
    state,
  });

  return `${OIDC_ENDPOINTS.authorize}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ id_token: string; access_token: string }> {
  const res = await fetch(OIDC_ENDPOINTS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: OIDC_CALLBACK_URL,
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();

    authLogger.error("Token exchange failed", { status: res.status, body: text });
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  const data = await res.json();

  return { id_token: data.id_token, access_token: data.access_token };
}

export interface IdTokenClaims {
  sub: string;
  preferred_username: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  eduperson_scoped_affiliation?: string[];
  eduperson_principal_name?: string;
}

export function parseIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split(".");

  if (parts.length !== 3) throw new Error("Invalid ID token format");

  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));

  return payload as IdTokenClaims;
}

// =============================================================================
// Session token (HMAC-SHA256 signed JSON)
// =============================================================================

export function createSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      authLogger.debug("Session expired", { username: payload.username });

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
