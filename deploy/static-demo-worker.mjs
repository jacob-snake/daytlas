import { previousDomainRedirect } from "./domain-redirect.ts";
import { accountConfiguration } from "./account/config.ts";
import { accountHandlers } from "./account/handler.ts";
import { createAccountProvider } from "./account/server.ts";
import { handleOura, configured } from './oura-worker.mjs';
import { assets, pages, marker, contentTypes } from './static-demo-manifest.mjs';

// Static assets plus an isolated, opt-in Oura OAuth and read-only relay. No SSR.
// Only immutable, build-validated files may be served or assigned a script nonce.
const aliases = { '/setup': '/connect', '/tags': '/app/tags', '/trends': '/app/trends', '/year': '/app/year' };
const baseHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
const privateHeaders = {
  ...baseHeaders,
  'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
};
function json(value, status = 200, head = false) {
  return new Response(head ? null : JSON.stringify(value), {
    status,
    headers: { ...privateHeaders, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
function freshNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
function csp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
export default {
  async fetch(request, env) {
    const redirect = previousDomainRedirect(request);
    if (redirect) return redirect;
    const url = new URL(request.url);
    const path = url.pathname;
    const head = request.method === 'HEAD';
    const ouraResponse = await handleOura(request, env);
    if (ouraResponse) return ouraResponse;
    if (path === '/api/account') {
      const handlers = accountHandlers(() => accountConfiguration(env), createAccountProvider);
      if (request.method === 'POST') return handlers.POST(request);
      if (request.method === 'GET' || head) {
        const response = await handlers.GET(request);
        return head ? new Response(null, { status: response.status, headers: response.headers }) : response;
      }
      return json({ error: 'method_not_allowed' }, 405);
    }
    if (path === '/api/health') {
      return request.method === 'GET' || head
        ? json({ status: 'ok', mode: configured(env) ? 'oura-browser-session' : 'synthetic-demo', accounts: Boolean(accountConfiguration(env)), oura: configured(env) }, 200, head)
        : json({ error: 'method_not_allowed' }, 405);
    }
    if (path === '/api/auth/login' && (request.method === 'GET' || head)) {
      return new Response(null, { status: 303, headers: { ...privateHeaders, Location: '/connect' } });
    }
    if (path === '/api' || path.startsWith('/api/')) return json({ error: 'unavailable_in_demo' }, 503, head);
    if (request.method !== 'GET' && !head) return json({ error: 'method_not_allowed' }, 405);
    const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    if (Object.hasOwn(aliases, normalized)) return new Response(null, { status: 308, headers: { ...privateHeaders, Location: aliases[normalized] } });

    const page = Object.hasOwn(pages, path) ? pages[path] : null;
    const asset = Object.hasOwn(assets, path) ? assets[path] : null;
    const file = page ?? asset ?? '/404.html';
    // Only a validated video byte range is forwarded; no cookies, tokens, queries or bodies.
    const range = request.headers.get('Range');
    const media = !!asset && path.startsWith('/media/') && path.endsWith('.mp4');
    const rangeHeaders = media && range && /^bytes=\d*-\d*$/.test(range) ? { Range: range } : {};
    const assetResponse = await env.ASSETS.fetch(new Request(`https://static.invalid${file}`, { method: 'GET', headers: rangeHeaders }));
    if (assetResponse.status !== 200 && !(media && [206, 416].includes(assetResponse.status))) return json({ error: 'asset_unavailable' }, 503, head);
    if (!page && asset) {
      const headers = new Headers(assetResponse.headers);
      for (const [name, value] of Object.entries(baseHeaders)) headers.set(name, value);
      headers.delete('Set-Cookie');
      if (Object.hasOwn(contentTypes, path)) headers.set('Content-Type', contentTypes[path]);
      if (path.startsWith('/_next/static/')) headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      if (media) headers.set('Accept-Ranges', 'bytes');
      // Some ASSETS implementations ignore Range. Public build assets are size-bounded;
      // slice the video fallback so Safari's initial bytes=0-1 probe receives a real206.
      if (media && rangeHeaders.Range && assetResponse.status === 200 && !head) {
        const bytes = await assetResponse.arrayBuffer();
        const total = bytes.byteLength;
        const [from, to] = range.slice(6).split('-');
        const suffix = from === '' ? Number(to) : null;
        const start = suffix !== null ? Math.max(0, total - suffix) : Number(from);
        const end = suffix !== null || to === '' ? total - 1 : Math.min(Number(to), total - 1);
        if ((!from && !to) || (suffix !== null && (!Number.isSafeInteger(suffix) || suffix === 0)) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) {
          headers.set('Content-Range', `bytes */${total}`);
          headers.set('Content-Length', '0');
          return new Response(null, { status: 416, headers });
        }
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
        headers.set('Content-Length', String(end - start + 1));
        return new Response(bytes.slice(start, end + 1), { status: 206, headers });
      }
      return new Response(head ? null : assetResponse.body, { status: assetResponse.status, headers });
    }

    const nonce = freshNonce();
    const headers = new Headers(privateHeaders);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Content-Security-Policy', csp(nonce));
    const status = page ? (file === '/404.html' ? 404 : 200) : 404;
    if (head) return new Response(null, { status, headers });
    const response = new Response(assetResponse.body, { status, headers });
    return new HTMLRewriter()
      .on(`script[data-daytlas-script="${marker}"]`, {
        element(element) {
          element.setAttribute('nonce', nonce);
          element.removeAttribute('data-daytlas-script');
        },
      })
      .transform(response);
  },
};
