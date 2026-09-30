import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

export const STATE_COOKIE = "daytlas_oauth_state";

function parseRedirect(value: string): URL | null {
  try {
    const redirect = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(
      redirect.hostname,
    );
    if (
      (redirect.protocol !== "https:" &&
        !(local && redirect.protocol === "http:")) ||
      redirect.pathname !== "/api/auth/callback" ||
      redirect.search ||
      redirect.hash ||
      redirect.username ||
      redirect.password
    )
      return null;
    return redirect;
  } catch {
    return null;
  }
}

/** Shared readiness check prevents a connection/login redirect loop on bad configuration. */
export function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.OURA_CLIENT_ID &&
    process.env.OURA_CLIENT_SECRET &&
    (!process.env.OURA_REDIRECT_URI ||
      parseRedirect(process.env.OURA_REDIRECT_URI)),
  );
}

export function oauthConfig(req: NextRequest) {
  if (!isOAuthConfigured()) return null;
  const redirect = parseRedirect(
    process.env.OURA_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/callback`,
  );
  if (!redirect) return null;
  return {
    clientId: process.env.OURA_CLIENT_ID!,
    clientSecret: process.env.OURA_CLIENT_SECRET!,
    redirectUri: redirect.toString(),
  };
}

export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: PRIVATE_HEADERS });
}

export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  try {
    return (
      !origin ||
      origin ===
        new URL(process.env.OURA_REDIRECT_URI || req.nextUrl.origin).origin
    );
  } catch {
    return false;
  }
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function validTokens(value: unknown): OAuthTokens | null {
  if (!value || typeof value !== "object") return null;
  const tokens = value as Record<string, unknown>;
  if (
    typeof tokens.access_token !== "string" ||
    !tokens.access_token.trim() ||
    tokens.access_token.length > 16_384
  )
    return null;
  if (
    tokens.refresh_token != null &&
    (typeof tokens.refresh_token !== "string" ||
      tokens.refresh_token.length > 16_384)
  )
    return null;
  return {
    access_token: tokens.access_token,
    ...(typeof tokens.refresh_token === "string" && tokens.refresh_token
      ? { refresh_token: tokens.refresh_token }
      : {}),
    ...(typeof tokens.expires_in === "number" &&
    Number.isFinite(tokens.expires_in) &&
    tokens.expires_in > 0
      ? { expires_in: tokens.expires_in }
      : {}),
  };
}
