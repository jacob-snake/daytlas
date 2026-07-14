import { NextRequest, NextResponse } from "next/server";

// Refreshes an expired access token. The refresh token comes from the
// browser and the new tokens go straight back — nothing is stored.

export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json();
  if (!refresh_token) {
    return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
  }

  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: process.env.OURA_CLIENT_ID ?? "",
      client_secret: process.env.OURA_CLIENT_SECRET ?? "",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Refresh failed" }, { status: 502 });
  }
  return NextResponse.json(await tokenRes.json());
}
