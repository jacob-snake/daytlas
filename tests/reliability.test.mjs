import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { GET as login } from "../src/app/api/auth/login/route.ts";
import { GET as callback } from "../src/app/api/auth/callback/route.ts";
import { POST as refresh } from "../src/app/api/auth/refresh/route.ts";
import { GET as proxy } from "../src/app/api/oura/[...path]/route.ts";
import {
  fetchAll,
  getCacheScope,
  getMode,
  hasSession,
  setToken,
  setMode,
  disconnectAndClear,
} from "../src/lib/oura/client.ts";
import { cacheClear, cacheGet, cacheSet } from "../src/lib/idb-cache.ts";
import { isOAuthConfigured } from "../src/app/api/auth/_shared.ts";

const originalFetch = globalThis.fetch;
const origin = "https://woura.example";
let storage;

function makeStorage() {
  const value = Object.create(null);
  Object.defineProperties(value, {
    getItem: { value: (key) => value[key] ?? null },
    setItem: {
      value: (key, item) => {
        value[key] = String(item);
      },
    },
    removeItem: {
      value: (key) => {
        delete value[key];
      },
    },
    clear: {
      value: () => {
        for (const key of Object.keys(value)) delete value[key];
      },
    },
  });
  return value;
}

function request(path, init = {}) {
  return new NextRequest(origin + path, init);
}
function collectionRequest(
  path = ["v2", "usercollection", "daily_sleep"],
  query = "",
) {
  return [
    request("/api/oura/" + path.join("/") + query, {
      headers: { authorization: "Bearer synthetic-access" },
    }),
    { params: Promise.resolve({ path }) },
  ];
}
function connect() {
  setToken("synthetic-access");
  setMode("live");
  storage.setItem("woura.refresh", "synthetic-refresh");
}
function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers });
}

beforeEach(() => {
  storage = makeStorage();
  globalThis.window = { localStorage: storage, location: { origin } };
  globalThis.fetch = async () => {
    throw new Error("Unexpected network request in synthetic test");
  };
  delete globalThis.indexedDB;
  process.env.OURA_CLIENT_ID = "synthetic-client";
  process.env.OURA_CLIENT_SECRET = "synthetic-secret";
  process.env.OURA_REDIRECT_URI = origin + "/api/auth/callback";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.window;
  delete globalThis.indexedDB;
  delete process.env.OURA_CLIENT_ID;
  delete process.env.OURA_CLIENT_SECRET;
  delete process.env.OURA_REDIRECT_URI;
});

test("login uses registered redirect, reduced scopes and secure short-lived state", async () => {
  const response = await login(request("/api/auth/login"));
  const destination = new URL(response.headers.get("location"));
  assert.equal(destination.origin, "https://cloud.ouraring.com");
  assert.equal(
    destination.searchParams.get("redirect_uri"),
    origin + "/api/auth/callback",
  );
  assert(!destination.searchParams.get("scope").includes("email"));
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=600/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("missing OAuth configuration gives a useful connection page", async () => {
  delete process.env.OURA_CLIENT_SECRET;
  const response = await login(request("/api/auth/login"));
  assert.equal(response.headers.get("location"), origin + "/connect");
});

test("connection readiness rejects invalid redirects instead of looping through login", async () => {
  assert.equal(isOAuthConfigured(), true);
  for (const uri of [
    "not-a-url",
    "http://public.example/api/auth/callback",
    origin + "/wrong-path",
    origin + "/api/auth/callback?next=other",
  ]) {
    process.env.OURA_REDIRECT_URI = uri;
    assert.equal(isOAuthConfigured(), false);
    assert.equal(
      (await login(request("/api/auth/login"))).headers.get("location"),
      origin + "/connect",
    );
  }
  delete process.env.OURA_REDIRECT_URI;
  assert.equal(isOAuthConfigured(), true);
  const destination = new URL(
    (await login(request("/api/auth/login"))).headers.get("location"),
  );
  assert.equal(
    destination.searchParams.get("redirect_uri"),
    origin + "/api/auth/callback",
  );
});

test("callback rejects mismatched state without contacting Oura", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({});
  };
  const response = await callback(
    request("/api/auth/callback?code=synthetic-code&state=wrong", {
      headers: { cookie: "woura_oauth_state=correct" },
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("callback escapes script-breaking provider tokens and restricts execution", async () => {
  const attack = '</script><script>alert("synthetic")</script>';
  globalThis.fetch = async () =>
    json({
      access_token: attack,
      refresh_token: "synthetic-refresh",
      expires_in: 3600,
    });
  const response = await callback(
    request("/api/auth/callback?code=synthetic-code&state=correct", {
      headers: { cookie: "woura_oauth_state=correct" },
    }),
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert(!html.includes(attack));
  assert.match(html, /location\.replace\("\/app"\)/);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.equal((html.match(/<script /g) ?? []).length, 1);
  const nonce = html.match(/<script nonce="([^"]+)"/)[1];
  assert(
    response.headers
      .get("content-security-policy")
      .includes(`'nonce-${nonce}'`),
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert(
    response.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.includes("Path=/api/auth") && cookie.includes("Max-Age=0"),
      ),
  );
});

test("OAuth failures never reflect provider debug bodies", async () => {
  globalThis.fetch = async () =>
    new Response("synthetic-private-debug-detail", { status: 400 });
  const response = await callback(
    request("/api/auth/callback?code=synthetic-code&state=correct", {
      headers: { cookie: "woura_oauth_state=correct" },
    }),
  );
  assert.equal(response.status, 502);
  assert(!(await response.text()).includes("synthetic-private-debug-detail"));
});

test("refresh validates origin, content type and JSON before provider access", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ access_token: "synthetic" });
  };
  for (const [body, headers, expected] of [
    [
      '{"refresh_token":"synthetic"}',
      { origin: "https://other.example", "content-type": "application/json" },
      403,
    ],
    ["bad", { "content-type": "text/plain" }, 415],
    ["{", { "content-type": "application/json" }, 400],
    ['{"refresh_token":{}}', { "content-type": "application/json" }, 400],
    ['{"refresh_token":""}', { "content-type": "application/json" }, 400],
  ]) {
    const response = await refresh(
      request("/api/auth/refresh", { method: "POST", body, headers }),
    );
    assert.equal(response.status, expected);
  }
  assert.equal(calls, 0);
});

test("refresh strips provider extras and protects returned credentials from caching", async () => {
  globalThis.fetch = async () =>
    json({
      access_token: "synthetic-new",
      expires_in: 3600,
      provider_debug: "private",
    });
  const response = await refresh(
    request("/api/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ refresh_token: "synthetic-refresh" }),
    }),
  );
  assert.deepEqual(await response.json(), {
    access_token: "synthetic-new",
    expires_in: 3600,
  });
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("proxy rejects traversal, unknown collections and query credentials", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ data: [] });
  };
  for (const path of [
    ["v2", "usercollection", "..", "personal_info"],
    ["v2", "usercollection", "..%2f..%2foauth%2ftoken"],
    ["v2", "usercollection", "unknown"],
  ])
    assert.equal((await proxy(...collectionRequest(path))).status, 403);
  assert.equal(
    (await proxy(...collectionRequest(undefined, "?access_token=synthetic")))
      .status,
    400,
  );
  assert.equal(
    (
      await proxy(
        ...collectionRequest(undefined, "?next_token=one&next_token=two"),
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
});

test("proxy forwards only safe headers, prevents redirects, and streams private JSON", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, "https://api.ouraring.com");
    assert.equal(url.pathname, "/v2/usercollection/daily_sleep");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(options.headers, {
      Authorization: "Bearer synthetic-access",
      Accept: "application/json",
    });
    return json({ data: [{ id: "synthetic-day" }], next_token: null }, 200, {
      "retry-after": "5",
      "set-cookie": "unwanted=value",
    });
  };
  const response = await proxy(...collectionRequest());
  assert.deepEqual((await response.json()).data, [{ id: "synthetic-day" }]);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("retry-after"), "5");
});

test("signed-out requests never silently load provider sandbox data", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ data: [], next_token: null });
  };
  await assert.rejects(fetchAll("daily_sleep", {}), { status: 401 });
  assert.equal(hasSession(), false);
  assert.equal(calls, 0);
});

test("demo has explicit identity and never uses a stored live token or network", async () => {
  connect();
  const live = getCacheScope();
  setMode("demo");
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("Demo network access");
  };
  const rows = await fetchAll("daily_sleep", {
    start_date: "2025-01-01",
    end_date: "2025-01-03",
  });
  assert.equal(rows.length, 3);
  assert.equal(getMode(), "demo");
  assert.equal(hasSession(), true);
  assert.notEqual(getCacheScope(), live);
  assert.equal(calls, 0);
});

test("collection requests deduplicate concurrent callers and detect repeated pages", async () => {
  connect();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ data: [{ id: "synthetic" }], next_token: null });
  };
  const [first, second] = await Promise.all([
    fetchAll("daily_sleep", {}),
    fetchAll("daily_sleep", {}),
  ]);
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ data: [], next_token: "same-page" });
  };
  await assert.rejects(fetchAll("daily_sleep", {}), /repeated a page/);
  assert.equal(calls, 2);
});

test("401 refresh is bounded and does not change the cache identity", async () => {
  connect();
  const scope = getCacheScope();
  let apiCalls = 0;
  let refreshCalls = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/auth/refresh") {
      refreshCalls++;
      return json({ access_token: "synthetic-new", expires_in: 60 });
    }
    apiCalls++;
    return json({}, 401);
  };
  await assert.rejects(fetchAll("daily_sleep", {}), { status: 401 });
  assert.equal(refreshCalls, 1);
  assert.equal(apiCalls, 2);
  assert.equal(getCacheScope(), scope);
  assert(Number(storage.getItem("woura.expiresAt")) > Date.now());
});

test("rate limiting stops after three retries", async () => {
  connect();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({}, 429, { "retry-after": "0" });
  };
  await assert.rejects(fetchAll("daily_sleep", {}), { status: 429 });
  assert.equal(calls, 4);
});

test("simultaneous expired requests share a refresh and both retry successfully", async () => {
  connect();
  let release;
  let refreshStarted;
  let refreshCalls = 0;
  const started = new Promise((resolve) => {
    refreshStarted = resolve;
  });
  globalThis.fetch = async (url, options) => {
    if (url === "/api/auth/refresh") {
      refreshCalls++;
      refreshStarted();
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return options.headers.Authorization === "Bearer synthetic-new"
      ? json({ data: [{ id: "synthetic" }], next_token: null })
      : json({}, 401);
  };
  const requests = Promise.all([
    fetchAll("daily_sleep", {}),
    fetchAll("daily_readiness", {}),
  ]);
  await started;
  await new Promise((resolve) => setImmediate(resolve));
  release(
    json({ access_token: "synthetic-new", refresh_token: "synthetic-rotated" }),
  );
  assert.equal((await requests).length, 2);
  assert.equal(refreshCalls, 1);
});

test("an in-flight refresh cannot restore a disconnected account", async () => {
  connect();
  let release;
  let refreshStarted;
  const started = new Promise((resolve) => {
    refreshStarted = resolve;
  });
  globalThis.fetch = async (url) => {
    if (url === "/api/auth/refresh") {
      refreshStarted();
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return json({}, 401);
  };
  const operation = fetchAll("daily_sleep", {});
  await started;
  await disconnectAndClear();
  release(
    json({ access_token: "synthetic-new", refresh_token: "synthetic-rotated" }),
  );
  await assert.rejects(operation, { status: 401 });
  assert.equal(storage.getItem("woura.token"), null);
  assert.equal(storage.getItem("woura.refresh"), null);
});

test("malformed collection responses fail clearly instead of crashing a dashboard", async () => {
  connect();
  globalThis.fetch = async () => json({ data: {}, next_token: null });
  await assert.rejects(fetchAll("daily_sleep", {}), { status: 502 });
});

test("an account switch invalidates in-flight responses and isolates new cache keys", async () => {
  connect();
  const scope = getCacheScope();
  let release;
  let started;
  const fetching = new Promise((resolve) => {
    started = resolve;
  });
  globalThis.fetch = async () => {
    started();
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  const operation = fetchAll("daily_sleep", {});
  await fetching;
  setToken("synthetic-other-account");
  assert.notEqual(getCacheScope(), scope);
  release(json({ data: [{ id: "old-account" }], next_token: null }));
  await assert.rejects(operation, { status: 401 });
});

test("disconnect removes all Woura credentials and metadata but not unrelated storage", async () => {
  connect();
  storage.setItem("woura.firstDay.v3", "2025-01-01");
  storage.setItem("unrelated-setting", "keep");
  await disconnectAndClear();
  assert.deepEqual(Object.keys(storage), ["unrelated-setting"]);
  assert.equal(hasSession(), false);
});

test("cache erasure waits for transaction commit and reports failure", async () => {
  const transactions = [];
  let closed = 0;
  const db = {
    close: () => closed++,
    transaction: () => {
      const transaction = { objectStore: () => ({ clear() {} }) };
      transactions.push(transaction);
      return transaction;
    },
  };
  globalThis.indexedDB = {
    open: () => {
      const req = { result: db };
      queueMicrotask(() => req.onsuccess());
      return req;
    },
  };
  let resolved = false;
  const erasure = cacheClear().then(() => {
    resolved = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resolved, false);
  transactions[0].oncomplete();
  await erasure;
  assert.equal(closed, 1);
  const failure = cacheClear();
  await new Promise((resolve) => setImmediate(resolve));
  transactions[1].onabort();
  await assert.rejects(failure, /could not be erased/);
  assert.equal(closed, 2);
});

test("unavailable local cache is a best-effort miss", async () => {
  assert.equal(await cacheGet("synthetic"), null);
  await assert.doesNotReject(cacheSet("synthetic", []));
});
