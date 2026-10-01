import test from "node:test";
import assert from "node:assert/strict";
import { configured, handleOura } from "../deploy/oura-worker.mjs";
const env = {
  OURA_ENABLED: "true",
  OURA_CLIENT_ID: "synthetic-client",
  OURA_CLIENT_SECRET: "synthetic-server-secret",
  OURA_REDIRECT_URI: "https://daytlas.com/api/auth/callback",
};
const request = (path, init = {}) =>
  new Request(`https://daytlas.com${path}`, init);
const refresh = (body, headers = {}) =>
  request("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
const auth = { Authorization: "Bearer synthetic-access" };

test("configuration fails closed and ordinary paths are not claimed", async () => {
  assert.equal(configured(env), true);
  for (const change of [
    { OURA_ENABLED: undefined },
    { OURA_ENABLED: true },
    { OURA_CLIENT_SECRET: " " },
    { OURA_REDIRECT_URI: "https://evil.example/api/auth/callback" },
    { OURA_REDIRECT_URI: `${env.OURA_REDIRECT_URI}?x=1` },
  ])
    assert.equal(configured({ ...env, ...change }), false);
  assert.equal(await handleOura(request("/app"), env), null);
  assert.equal(
    (await handleOura(request("/api/auth/login"), {})).headers.get("Location"),
    "https://daytlas.com/connect",
  );
  assert.equal(
    (
      await handleOura(
        request("/api/oura/v2/usercollection/sleep", { headers: auth }),
        {},
      )
    ).status,
    503,
  );
});

test("login creates secure short-lived state, canonicalizes domains and never exposes secret", async () => {
  const result = await handleOura(request("/api/auth/login"), env);
  const location = new URL(result.headers.get("Location"));
  assert.equal(result.status, 303);
  assert.equal(location.origin, "https://cloud.ouraring.com");
  assert.equal(
    location.searchParams.get("redirect_uri"),
    env.OURA_REDIRECT_URI,
  );
  assert.equal(location.searchParams.get("scope").includes("email"), false);
  assert(location.searchParams.get("scope").split(" ").includes("heart_health"));
  assert.match(
    result.headers.get("Set-Cookie"),
    /Max-Age=600; HttpOnly; Secure; SameSite=Lax/,
  );
  assert.equal(location.href.includes(env.OURA_CLIENT_SECRET), false);
  for (const origin of [
    "https://www.daytlas.com",
    "https://daytlas.daytlas.workers.dev",
  ]) {
    const canonical = await handleOura(
      new Request(`${origin}/api/auth/login?return=https://evil.example`),
      env,
    );
    assert.equal(
      canonical.headers.get("Location"),
      "https://daytlas.com/api/auth/login",
    );
    assert.equal(canonical.headers.has("Set-Cookie"), false);
  }
});

test("method and origin restrictions reject before any upstream request", async () => {
  for (const path of [
    "/api/auth/login",
    "/api/auth/callback",
    "/api/oura/v2/usercollection/sleep",
  ])
    assert.equal(
      (await handleOura(request(path, { method: "POST" }), env)).status,
      405,
    );
  assert.equal(
    (await handleOura(request("/api/auth/refresh"), env)).status,
    405,
  );
  for (const headers of [
    { Origin: "https://evil.example" },
    { "Sec-Fetch-Site": "cross-site" },
  ]) {
    assert.equal(
      (await handleOura(refresh('{"refresh_token":"x"}', headers), env)).status,
      403,
    );
    assert.equal(
      (
        await handleOura(
          request("/api/oura/v2/usercollection/sleep", {
            headers: { ...auth, ...headers },
          }),
          env,
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await handleOura(
        new Request("https://www.daytlas.com/api/auth/callback?state=x&code=x"),
        env,
      )
    ).status,
    403,
  );
});

test("callback validates state, duplicates and denial; clears cookie on failure", async () => {
  const headers = { Cookie: "daytlas_oauth_state=expected" };
  for (const query of [
    "code=x",
    "state=wrong&code=x",
    "state=expected&state=expected&code=x",
    "state=expected&code=a&code=b",
    "state=expected&error=access_denied",
    "state=expected",
  ]) {
    const result = await handleOura(
      request(`/api/auth/callback?${query}`, { headers }),
      env,
    );
    assert.equal(result.status, 400);
    assert.match(result.headers.get("Set-Cookie"), /Max-Age=0/);
    assert.match(result.headers.get("Cache-Control"), /no-store/);
  }
  const duplicateCookie = await handleOura(
    request("/api/auth/callback?state=expected&code=x", {
      headers: {
        Cookie: "daytlas_oauth_state=expected; daytlas_oauth_state=expected",
      },
    }),
    env,
  );
  assert.equal(duplicateCookie.status, 400);
});

test("callback only posts fixed token endpoint, embeds escaped tokens and strips upstream extras", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls++;
    assert.equal(url, "https://api.ouraring.com/oauth/token");
    assert.equal(init.redirect, "manual");
    assert.equal(init.body.get("client_secret"), env.OURA_CLIENT_SECRET);
    assert.equal(init.body.get("redirect_uri"), env.OURA_REDIRECT_URI);
    return Response.json({
      access_token: "access</script><script>alert(1)</script>",
      refresh_token: "synthetic-refresh",
      expires_in: 3600,
      secret: env.OURA_CLIENT_SECRET,
    });
  });
  const result = await handleOura(
    request("/api/auth/callback?state=expected&code=synthetic-code", {
      headers: {
        Cookie: "daytlas_oauth_state=expected",
        "Sec-Fetch-Site": "cross-site",
      },
    }),
    env,
  );
  assert.equal(result.status, 200);
  const html = await result.text();
  assert.equal(calls, 1);
  assert.equal(html.includes(env.OURA_CLIENT_SECRET), false);
  assert.equal(html.includes("access</script>"), false);
  assert.match(html, /access\\u003c/);
  assert.match(html, /history.replaceState/);
  assert.match(html, /indexedDB.deleteDatabase/);
  assert.match(
    result.headers.get("Content-Security-Policy"),
    /default-src 'none'; script-src 'nonce-/,
  );
});

test("refresh enforces body shape, size and media type", async () => {
  assert.equal(
    (await handleOura(refresh("{}", { "Content-Type": "text/plain" }), env))
      .status,
    415,
  );
  for (const value of [
    "null",
    "{",
    "{}",
    '{"refresh_token":" "}',
    JSON.stringify({ refresh_token: "x".repeat(16385) }),
  ])
    assert.equal((await handleOura(refresh(value), env)).status, 400);
  assert.equal(
    (
      await handleOura(
        refresh(JSON.stringify({ refresh_token: "x".repeat(20001) })),
        env,
      )
    ).status,
    413,
  );
});

test("refresh rotates tokens without reflecting provider extras or error body", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.body.get("grant_type"), "refresh_token");
    return Response.json({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 60,
      client_secret: env.OURA_CLIENT_SECRET,
    });
  });
  const result = await handleOura(
    refresh('{"refresh_token":"old-refresh"}'),
    env,
  );
  assert.deepEqual(await result.json(), {
    access_token: "new-access",
    refresh_token: "new-refresh",
    expires_in: 60,
  });
  t.mock.restoreAll();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(env.OURA_CLIENT_SECRET, { status: 400 }),
  );
  const failed = await handleOura(
    refresh('{"refresh_token":"old-refresh"}'),
    env,
  );
  assert.equal(failed.status, 401);
  assert.equal((await failed.text()).includes(env.OURA_CLIENT_SECRET), false);
});

test("relay blocks arbitrary hosts, endpoints, auth and duplicate query keys", async () => {
  for (const path of [
    "https://evil.example",
    "v2/usercollection/not_allowed",
    "v2/usercollection/sleep/id",
    "v2/usercollection/%73leep",
  ])
    assert.equal(
      (await handleOura(request(`/api/oura/${path}`, { headers: auth }), env))
        .status,
      403,
    );
  assert.equal(
    (await handleOura(request("/api/oura/v2/usercollection/sleep"), env))
      .status,
    401,
  );
  for (const query of [
    "url=https://evil.example",
    "start_date=x&start_date=y",
    `next_token=${"x".repeat(8193)}`,
  ])
    assert.equal(
      (
        await handleOura(
          request(`/api/oura/v2/usercollection/sleep?${query}`, {
            headers: auth,
          }),
          env,
        )
      ).status,
      400,
    );
});

test("relay forwards only fixed collection, bearer and allowed query, retaining retry/private headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(
      String(url),
      "https://api.ouraring.com/v2/usercollection/sleep?start_date=2026-09-01",
    );
    assert.deepEqual(init.headers, {
      Authorization: auth.Authorization,
      Accept: "application/json",
    });
    assert.equal(init.redirect, "manual");
    return new Response('{"error":"rate_limit"}', {
      status: 429,
      headers: { "Retry-After": "12", "Set-Cookie": "provider_secret=x" },
    });
  });
  const result = await handleOura(
    request("/api/oura/v2/usercollection/sleep?start_date=2026-09-01", {
      headers: { ...auth, Cookie: "private=x" },
    }),
    env,
  );
  assert.equal(result.status, 429);
  assert.equal(result.headers.get("Retry-After"), "12");
  assert.equal(result.headers.get("Set-Cookie"), null);
  assert.equal(result.headers.get("Vary"), "Authorization");
  assert.match(result.headers.get("Cache-Control"), /no-store/);
});

test("upstream redirects are rejected instead of followed or exposed", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: { Location: "https://evil.example/" },
    });
  });
  const relay = await handleOura(
    request("/api/oura/v2/usercollection/sleep", { headers: auth }),
    env,
  );
  assert.equal(relay.status, 502);
  assert.equal(relay.headers.get("Location"), null);
  const refreshed = await handleOura(
    refresh('{"refresh_token":"synthetic"}'),
    env,
  );
  assert.equal(refreshed.status, 502);
  const callback = await handleOura(
    request("/api/auth/callback?state=expected&code=synthetic", {
      headers: { Cookie: "daytlas_oauth_state=expected" },
    }),
    env,
  );
  assert.equal(callback.status, 502);
});

test("staged domain cutover keeps the previous origin working without allowing cross-origin API access", async () => {
  const previous = "https://mebyday.com";
  const legacyEnv = { ...env, PUBLIC_SITE_URL: previous, OURA_REDIRECT_URI: `${previous}/api/auth/callback` };
  assert.equal(configured(legacyEnv), true);
  const login = await handleOura(new Request(`${previous}/api/auth/login`), legacyEnv);
  assert.equal(new URL(login.headers.get("Location")).searchParams.get("redirect_uri"), `${previous}/api/auth/callback`);
  assert.equal((await handleOura(new Request(`${previous}/api/oura/v2/usercollection/sleep`, { headers: { ...auth, Origin: "https://daytlas.com" } }), legacyEnv)).status, 403);
  assert.equal((await handleOura(new Request(`${previous}/api/oura/v2/usercollection/sleep`, { headers: auth }), env)).status, 403);
  assert.equal(configured({ ...env, PUBLIC_SITE_URL: "https://evil.example" }), false);
});

test("opt-in recovery keeps each origin's login and relay isolated after cutover", async (t) => {
  const current = "https://daytlas.com";
  const previous = "https://mebyday.com";
  const recoveryEnv = { ...env, PUBLIC_SITE_URL: current, DAYTLAS_PREVIOUS_ORIGIN_ENABLED: "true" };
  const upstream = t.mock.method(globalThis, "fetch", async () => new Response('{"data":[]}'));
  for (const origin of [current, previous]) {
    const login = await handleOura(new Request(`${origin}/api/auth/login`), recoveryEnv);
    assert.equal(new URL(login.headers.get("Location")).searchParams.get("redirect_uri"), `${origin}/api/auth/callback`);
    assert(!login.headers.get("Set-Cookie").includes("Domain="));
    const path = `${origin}/api/oura/v2/usercollection/sleep`;
    assert.equal((await handleOura(new Request(path, { headers: { ...auth, Origin: origin } }), recoveryEnv)).status, 200);
    for (const other of [origin === current ? previous : current, "https://evil.example"]) {
      assert.equal((await handleOura(new Request(path, { headers: { ...auth, Origin: other } }), recoveryEnv)).status, 403);
    }
    assert.equal((await handleOura(new Request(path, { headers: { ...auth, "Sec-Fetch-Site": "cross-site" } }), recoveryEnv)).status, 403);
  }
  assert.equal(upstream.mock.callCount(), 2);
  assert.equal(recoveryEnv.PUBLIC_SITE_URL, current);
  for (const change of [{ DAYTLAS_PREVIOUS_ORIGIN_ENABLED: "false" }, { PUBLIC_SITE_URL: "https://evil.example" }, { OURA_REDIRECT_URI: "https://evil.example/callback" }]) {
    assert.equal((await handleOura(new Request(`${previous}/api/oura/v2/usercollection/sleep`, { headers: auth }), { ...recoveryEnv, ...change })).status, 403);
  }
});

test("previous-origin callback exchanges its own redirect URI and retains state protection", async (t) => {
  const previous = "https://mebyday.com";
  const recoveryEnv = { ...env, PUBLIC_SITE_URL: "https://daytlas.com", DAYTLAS_PREVIOUS_ORIGIN_ENABLED: "true" };
  const upstream = t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(new URLSearchParams(init.body).get("redirect_uri"), `${previous}/api/auth/callback`);
    return new Response('{"error":"invalid_grant"}', { status: 400 });
  });
  const invalid = await handleOura(new Request(`${previous}/api/auth/callback?state=wrong&code=synthetic`, { headers: { Cookie: "daytlas_oauth_state=expected" } }), recoveryEnv);
  assert.equal(invalid.status, 400);
  assert.equal(upstream.mock.callCount(), 0);
  await handleOura(new Request(`${previous}/api/auth/callback?state=expected&code=synthetic`, { headers: { Cookie: "daytlas_oauth_state=expected" } }), recoveryEnv);
  assert.equal(upstream.mock.callCount(), 1);
});
