import { previousDomainRedirect } from "@/lib/domain-redirect";
import { productAnalyticsConfiguration } from "@/lib/product-analytics";
import { NextRequest, NextResponse } from "next/server";

/** Per-request nonces require dynamic rendering in the root layout. */
export function proxy(request: NextRequest) {
  const redirect = previousDomainRedirect(request);
  if (redirect) return redirect;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const analytics = productAnalyticsConfiguration();
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${analytics ? ` ${analytics.host}` : ""}${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2|mp4)$).*)",
  ],
};
