import { NextRequest, NextResponse } from "next/server";

// Exchanges the OAuth code for tokens, then hands them to the browser via a
// tiny inline page that writes localStorage and redirects. Tokens are never
// stored server-side.

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get("woura_oauth_state")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state or missing code" }, { status: 400 });
  }

  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.OURA_CLIENT_ID ?? "",
      client_secret: process.env.OURA_CLIENT_SECRET ?? "",
      redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    return NextResponse.json({ error: "Token exchange failed", detail }, { status: 502 });
  }

  const tokens: { access_token: string; refresh_token?: string; expires_in?: number } =
    await tokenRes.json();

  const payload = JSON.stringify({
    token: tokens.access_token,
    refresh: tokens.refresh_token ?? null,
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
  });

  const html = `<!doctype html><meta charset="utf-8"><script>
    const t = ${payload};
    localStorage.setItem("woura.token", t.token);
    if (t.refresh) localStorage.setItem("woura.refresh", t.refresh);
    if (t.expiresAt) localStorage.setItem("woura.expiresAt", String(t.expiresAt));
    localStorage.setItem("woura.mode", "live");
    location.replace("/");
  </script>`;

  const res = new NextResponse(html, { headers: { "content-type": "text/html" } });
  res.cookies.delete("woura_oauth_state");
  return res;
}
