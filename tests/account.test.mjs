import test from "node:test";
import assert from "node:assert/strict";
import { accountConfiguration } from "../src/lib/account/config.ts";
import { accountHandlers, AccountError } from "../src/lib/account/handler.ts";
import { createAccountProvider } from "../src/lib/account/server.ts";

const config = {
  url: "https://example.supabase.co",
  key: "sb_publishable_test",
  origin: "https://mebyday.com",
  preferences: true,
};
const verified = { id: "user-a", email: "person@example.test", verified: true };
function fixture(overrides = {}, enabled = true) {
  const calls = [];
  const provider = {
    user: async () => verified,
    requestCode: async (email) => {
      calls.push(["request", email]);
    },
    verifyCode: async (email, code) => {
      calls.push(["verify", email, code]);
      return verified;
    },
    signOut: async () => {
      calls.push(["signout"]);
    },
    profile: async (id) => {
      calls.push(["profile", id]);
      return "Reader";
    },
    saveProfile: async (id, name) => {
      calls.push(["save", id, name]);
    },
    cookies: () => {},
    ...overrides,
  };
  return {
    calls,
    handlers: accountHandlers(
      () => (enabled ? config : null),
      () => {
        calls.push(["provider"]);
        return provider;
      },
    ),
  };
}
function post(value, headers = {}) {
  return new Request("https://mebyday.com/api/account", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: config.origin,
      ...headers,
    },
    body: JSON.stringify(value),
  });
}

test("account config fails closed and never accepts a service key or arbitrary provider URL", () => {
  const good = {
    MEBYDAY_ACCOUNTS_ENABLED: "true",
    SUPABASE_URL: config.url,
    SUPABASE_PUBLISHABLE_KEY: config.key,
    PUBLIC_SITE_URL: config.origin,
  };
  assert.equal(accountConfiguration(good)?.preferences, false);
  for (const patch of [
    { MEBYDAY_ACCOUNTS_ENABLED: "false" },
    { SUPABASE_PUBLISHABLE_KEY: "sb_secret_private" },
    { SUPABASE_PUBLISHABLE_KEY: "eyJservice-role" },
    { SUPABASE_URL: "https://evil.test" },
    { SUPABASE_URL: "https://example.supabase.co/elsewhere" },
    { PUBLIC_SITE_URL: "http://mebyday.com" },
    { PUBLIC_SITE_URL: "https://mebyday.com/?next=evil" },
  ])
    assert.equal(accountConfiguration({ ...good, ...patch }), null);
});
test("disabled account routes do not initialize a provider or collect email", async () => {
  const { calls, handlers } = fixture({}, false);
  assert.equal(
    (await handlers.GET(new Request("https://mebyday.com/api/account")))
      .status,
    200,
  );
  assert.equal(
    (
      await handlers.POST(
        post({ action: "request_code", email: verified.email }),
      )
    ).status,
    503,
  );
  assert.deepEqual(calls, []);
});
test("account mutations reject missing, cross-site and forged origins before provider access", async () => {
  const { calls, handlers } = fixture();
  for (const headers of [
    { origin: "" },
    { origin: "https://evil.test" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    assert.equal(
      (await handlers.POST(post({ action: "sign_out" }, headers))).status,
      403,
    );
  }
  assert.deepEqual(calls, []);
});
test("health payloads, identity overrides, redirects and oversized requests cannot reach the provider", async () => {
  const { calls, handlers } = fixture();
  for (const input of [
    {
      action: "request_code",
      email: verified.email,
      next: "https://evil.test",
    },
    { action: "save_profile", displayName: "Me", userId: "victim" },
    { action: "save_profile", displayName: "Me", sleep: 80 },
    { action: "request_code", email: "x".repeat(5000) },
    { action: "verify_code", email: verified.email, code: "123" },
    { action: "__proto__" },
  ])
    assert.equal((await handlers.POST(post(input))).status, 400);
  assert.deepEqual(calls, []);
});
test("email is sent only from explicit request action with no account details in response", async () => {
  const { calls, handlers } = fixture();
  const response = await handlers.POST(
    post({ action: "request_code", email: " Person@Example.test " }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls, [["provider"], ["request", verified.email]]);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
});
test("unverified or different-email OTP result is signed out and never becomes an account", async () => {
  for (const user of [
    { ...verified, verified: false },
    { ...verified, email: "other@example.test" },
    null,
  ]) {
    const { calls, handlers } = fixture({ verifyCode: async () => user });
    const response = await handlers.POST(
      post({ action: "verify_code", email: verified.email, code: "123456" }),
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_code" });
    assert.ok(calls.some((call) => call[0] === "signout"));
  }
});
test("unverified users cannot read or save a profile", async () => {
  const { calls, handlers } = fixture({
    user: async () => ({ ...verified, verified: false }),
  });
  const session = await handlers.GET(
    new Request("https://mebyday.com/api/account"),
  );
  assert.equal((await session.json()).account, null);
  assert.equal(
    (await handlers.POST(post({ action: "save_profile", displayName: "Me" })))
      .status,
    401,
  );
  assert.ok(!calls.some((call) => ["profile", "save"].includes(call[0])));
});
test("profile ownership is derived from verified server identity, session response excludes tokens and IDs", async () => {
  const { calls, handlers } = fixture();
  const response = await handlers.POST(
    post({ action: "save_profile", displayName: " Reader " }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(calls.at(-1), ["save", verified.id, "Reader"]);
  const session = await handlers.GET(
    new Request("https://mebyday.com/api/account"),
  );
  assert.deepEqual(await session.json(), {
    enabled: true,
    preferences: true,
    account: { email: verified.email, displayName: "Reader" },
  });
  assert.equal(session.headers.get("vary"), "Cookie");
});
test("provider rate limits survive the relay while provider internals and PII never leak", async () => {
  const { handlers } = fixture({
    requestCode: async () => {
      throw new AccountError("rate_limited");
    },
  });
  const response = await handlers.POST(
    post({ action: "request_code", email: verified.email }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.deepEqual(await response.json(), { error: "rate_limited" });
  const other = fixture({
    requestCode: async () => {
      throw new Error("private provider failure person@example.test secret");
    },
  });
  const unavailable = await other.handlers.POST(
    post({ action: "request_code", email: verified.email }),
  );
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "unavailable" });
});

test("real Supabase adapter sets secure HTTP-only cookies and validates the user at Auth before returning identity", async () => {
  const originalFetch = globalThis.fetch;
  const user = {
    id: "a0000000-0000-4000-a000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: verified.email,
    email_confirmed_at: "2026-09-27T10:00:00Z",
    created_at: "2026-09-27T10:00:00Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
  };
  const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
  const paths = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    paths.push(path);
    assert.equal(init.cache, "no-store");
    if (path === "/auth/v1/verify")
      return Response.json({
        access_token: token,
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    if (path === "/auth/v1/user") return Response.json(user);
    throw new Error("Unexpected provider call");
  };
  try {
    const provider = createAccountProvider(
      new Request("https://mebyday.com/api/account"),
      config,
    );
    const result = await provider.verifyCode(verified.email, "123456");
    assert.equal(result.verified, true);
    assert.deepEqual(paths, ["/auth/v1/verify", "/auth/v1/user"]);
    const response = Response.json({ ok: true });
    provider.cookies(response);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /mbd-account=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=2592000/);
    assert.doesNotMatch(cookie, /Domain=/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
