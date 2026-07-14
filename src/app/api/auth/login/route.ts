import { NextRequest, NextResponse } from "next/server";

const SCOPES = "email personal daily heartrate workout tag session spo2";

export async function GET(req: NextRequest) {
  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "OURA_CLIENT_ID not configured. Add it to .env.local." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const url = new URL("https://cloud.ouraring.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${req.nextUrl.origin}/api/auth/callback`);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("woura_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
