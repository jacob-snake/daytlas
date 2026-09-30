import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, PRIVATE_HEADERS, privateJson } from "../../auth/_shared";

// Read-only, fixed-host proxy. Tokens and health responses are forwarded in
// transit; this application does not persist or log them on the server.
const COLLECTIONS = new Set([
  "daily_sleep",
  "daily_readiness",
  "daily_activity",
  "daily_stress",
  "daily_spo2",
  "daily_resilience",
  "daily_cardiovascular_age",
  "sleep",
  "heartrate",
  "workout",
  "session",
  "tag",
  "enhanced_tag",
  "sleep_time",
  "rest_mode_period",
  "ring_battery_level",
  "ring_configuration",
  "personal_info",
  "vO2_max",
]);
const PARAMETERS = new Set([
  "start_date",
  "end_date",
  "start_datetime",
  "end_datetime",
  "next_token",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!isSameOrigin(req))
    return privateJson({ error: "Origin not allowed" }, 403);
  const { path } = await params;
  const live =
    path.length === 3 && path[0] === "v2" && path[1] === "usercollection";
  const sandbox =
    path.length === 4 &&
    path[0] === "v2" &&
    path[1] === "sandbox" &&
    path[2] === "usercollection";
  if ((!live && !sandbox) || !COLLECTIONS.has(path[path.length - 1]))
    return privateJson({ error: "Path not allowed" }, 403);
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer \S+$/i.test(auth) || auth.length > 16_400)
    return privateJson({ error: "Authorization required" }, 401);
  const url = new URL(`https://api.ouraring.com/${path.join("/")}`);
  for (const [key, value] of req.nextUrl.searchParams) {
    if (
      !PARAMETERS.has(key) ||
      value.length > 8192 ||
      url.searchParams.has(key)
    )
      return privateJson({ error: "Invalid query parameters" }, 400);
    url.searchParams.set(key, value);
  }
  try {
    const upstream = await fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    const headers = new Headers({
      ...PRIVATE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Authorization",
    });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return privateJson({ error: "Oura is temporarily unavailable" }, 502);
  }
}
