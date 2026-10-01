/** Retired public hosts only; never redirect tokens or replay a request body. */
export function previousDomainRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (!["mebyday.com", "www.mebyday.com"].includes(url.hostname)) return null;
  const headers = {
    "Cache-Control": "private, no-store",
    "CDN-Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, {
      status: 409,
      headers: { ...headers, Location: "https://daytlas.com/connect" },
    });
  // OAuth state/cookies belong to the old origin. Restart on the canonical origin instead of forwarding codes.
  if (url.pathname.startsWith("/api/"))
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: "https://daytlas.com/connect" },
    });
  url.protocol = "https:";
  url.hostname = "daytlas.com";
  url.port = "";
  return new Response(null, {
    status: 308,
    headers: { ...headers, Location: url.href },
  });
}
