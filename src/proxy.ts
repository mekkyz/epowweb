import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/eASiMOV.png", "/ESA-Logo.png"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  const session = verifySessionToken(token);
  if (!session) {
    return redirectToLogin(request);
  }

  // Protect /admin — only admin users
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/", getOrigin(request)));
    }
  }

  return NextResponse.next();
}

function getOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol?.replace(":", "") ||
    "http";
  return `${proto}://${host}`;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", getOrigin(request));
  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}
