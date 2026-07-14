import { NextRequest, NextResponse } from "next/server";

// Stateless pass-through proxy to the Oura API.
// Exists only because api.ouraring.com does not send CORS headers for
// third-party origins. It forwards the request and returns the response —
// nothing is logged, stored, or inspected. See docs/SECURITY_ARCHITECTURE.md.

const OURA_BASE = "https://api.ouraring.com";
const ALLOWED_PREFIXES = ["v2/usercollection/", "v2/sandbox/usercollection/"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");

  if (!ALLOWED_PREFIXES.some((p) => joined.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const url = new URL(`${OURA_BASE}/${joined}`);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const auth = req.headers.get("authorization");
  const upstream = await fetch(url, {
    headers: auth ? { Authorization: auth } : undefined,
    cache: "no-store",
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "retry-after": upstream.headers.get("retry-after") ?? "",
    },
  });
}
