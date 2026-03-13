import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  parseIdToken,
  createSessionToken,
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  FROM_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { getUserRole, updateUserProfile } from "@/services/auth-store";
import { createLogger } from "@/lib/logger";

const authLogger = createLogger("Auth");

function getOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol?.replace(":", "") ||
    "http";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE_NAME)?.value;
  const from = request.cookies.get(FROM_COOKIE_NAME)?.value || "/";
  const origin = getOrigin(request);

  // validate state to prevent CSRF
  if (!code || !state || state !== storedState) {
    authLogger.warn("Invalid OIDC callback", {
      hasCode: !!code,
      stateMatch: state === storedState,
    });
    return NextResponse.redirect(new URL("/login?error=invalid_state", origin));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const claims = parseIdToken(tokens.id_token);
    const kuerzel = claims.preferred_username;
    const role = getUserRole(kuerzel);

    authLogger.info("OIDC login successful", { kuerzel, role, email: claims.email });

    // Persist OIDC profile data for admin panel display
    if (role !== "demo") {
      updateUserProfile(kuerzel, {
        email: claims.email,
        affiliation: claims.eduperson_scoped_affiliation,
      });
    }

    const sessionToken = createSessionToken({
      username: kuerzel,
      role,
      name: claims.name,
      email: claims.email,
    });

    const response = NextResponse.redirect(new URL(from, origin));

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    // Clear OIDC state cookies
    response.cookies.set(STATE_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    response.cookies.set(FROM_COOKIE_NAME, "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    authLogger.error("OIDC callback failed", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }
}
