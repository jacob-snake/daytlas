import assert from 'node:assert/strict';
// Read-only local protocol/security smoke test; no browser automation or external requests.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3020');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Local preview only');
assert(base.protocol === 'http:' || base.protocol === 'https:');
assert(base.pathname === '/' && !base.search && !base.hash);
const nonces = new Set();
const results = [];
for (const path of ['/', '/index.html', '/app', '/app/profile', '/app/year', '/app/onboarding', '/account', '/install', '/app/profile/', '/not-a-real-page', '/404.html']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, ['/not-a-real-page', '/404.html'].includes(path) ? 404 : 200, path);
  const html = await response.text();
  const csp = response.headers.get('Content-Security-Policy');
  const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
  assert(nonce && !nonces.has(nonce), `Unique nonce: ${path}`);
  nonces.add(nonce);
  assert.equal(Buffer.from(nonce, 'base64').length, 16);
  assert(!csp.split('script-src')[1].split(';')[0].includes('unsafe-inline'));
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  assert(scripts.length > 0, path);
  assert(scripts.every(tag => tag.includes(`nonce="${nonce}"`)), path);
  assert(!html.includes('data-mebyday-script'));
  assert(response.headers.get('Cache-Control')?.includes('private, no-store'));
  assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
  assert(!response.headers.has('set-cookie'));
  results.push({ path, status: response.status, scripts: scripts.length });
}
const probe = await fetch(new URL('/?private_probe=synthetic-marker', base), {
  headers: { Cookie: 'health_probe=synthetic-marker', Authorization: 'Bearer synthetic-do-not-forward' },
});
const probeHtml = await probe.text();
assert(!probeHtml.includes('synthetic-marker') && !probeHtml.includes('synthetic-do-not-forward'));
for (const path of ['/app.txt?_rsc=synthetic', '/app/__next._full.txt', '/manifest.webmanifest', '/app-icons/192', '/app-icons/512', '/apple-icon', '/icon', '/opengraph-image']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, 200, path);
  if (['/app-icons/192', '/app-icons/512', '/apple-icon', '/icon', '/opengraph-image'].includes(path)) {
    assert.equal(response.headers.get('Content-Type'), 'image/png', path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), path);
  }
}
const account = await fetch(new URL('/api/account', base));
assert.deepEqual(await account.json(), { enabled: false, preferences: false, account: null });
assert.equal(account.headers.get('CDN-Cache-Control'), 'no-store');
for (const path of ['/api/account']) {
  const response = await fetch(new URL(path, base), { method: 'POST', body: '{"synthetic":true}', headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 503, path);
  assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
}
const health = await fetch(new URL('/api/health', base));
assert.equal((await health.json()).mode, 'synthetic-demo');
for (const [path, target, status] of [['/setup', '/connect', 308], ['/year', '/app/year', 308], ['/api/auth/login', 'https://mebyday.com/api/auth/login', 303]]) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Location'), target);
}
assert.equal((await fetch(new URL('/.env', base))).status, 404);
const head = await fetch(new URL('/app', base), { method: 'HEAD' });
assert.equal(head.status, 200);
assert(head.headers.has('Content-Security-Policy'));
assert.equal(await head.text(), '');
console.log(JSON.stringify({ result: 'passed', browserHydration: 'not-covered', liveCpu: 'not-covered', checks: results }, null, 2));
