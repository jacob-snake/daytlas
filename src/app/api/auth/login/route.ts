import { NextRequest, NextResponse } from "next/server";
import { oauthConfig, PRIVATE_HEADERS, STATE_COOKIE } from "../_shared";

// Only scopes used by the dashboard and exports. No email/profile permission.
const SCOPES = "daily heartrate workout tag session spo2";

export async function GET(req: NextRequest) {
  const config = oauthConfig(req);
  if (!config)
    return NextResponse.redirect(new URL("/connect", req.url), {
      headers: PRIVATE_HEADERS,
    });
  const state = crypto.randomUUID();
  const url = new URL("https://cloud.ouraring.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url, { headers: PRIVATE_HEADERS });
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(config.redirectUri).protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth",
  });
  return response;
}
