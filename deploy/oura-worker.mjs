// Native Fetch/Web Crypto only: no SSR, storage, telemetry or secret logging.
const ORIGIN = "https://daytlas.com";
// Temporary compatibility origin: keep existing browser data reachable during DNS/OAuth cutover.
const PREVIOUS_ORIGIN = "https://mebyday.com";
function siteOrigin(env) {
  return env?.PUBLIC_SITE_URL === PREVIOUS_ORIGIN ? PREVIOUS_ORIGIN : ORIGIN;
}
function callbackUrl(env) {
  return `${siteOrigin(env)}/api/auth/callback`;
}
const STATE = "daytlas_oauth_state";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const PRIVATE = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
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

export function configured(env) {
  return (
    env?.OURA_ENABLED === "true" &&
    typeof env.OURA_CLIENT_ID === "string" &&
    !!env.OURA_CLIENT_ID.trim() &&
    typeof env.OURA_CLIENT_SECRET === "string" &&
    !!env.OURA_CLIENT_SECRET.trim() &&
    (!env.PUBLIC_SITE_URL || [ORIGIN, PREVIOUS_ORIGIN].includes(env.PUBLIC_SITE_URL)) &&
    env.OURA_REDIRECT_URI === callbackUrl(env)
  );
}
function json(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...PRIVATE,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}
function redirect(location) {
  return new Response(null, {
    status: 303,
    headers: { ...PRIVATE, Location: location },
  });
}
function sameOrigin(request, origin) {
  return (
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!request.headers.has("origin") || request.headers.get("origin") === origin)
  );
}
function serialize(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
function tokens(value) {
  if (
    !value ||
    typeof value.access_token !== "string" ||
    !value.access_token.trim() ||
    value.access_token.length > 16384
  )
    return null;
  if (
    value.refresh_token != null &&
    (typeof value.refresh_token !== "string" ||
      value.refresh_token.length > 16384)
  )
    return null;
  return {
    access_token: value.access_token,
    ...(value.refresh_token ? { refresh_token: value.refresh_token } : {}),
    ...(typeof value.expires_in === "number" &&
    Number.isFinite(value.expires_in) &&
    value.expires_in > 0 &&
    value.expires_in <= Number.MAX_SAFE_INTEGER / 1000
      ? { expires_in: value.expires_in }
      : {}),
  };
}
function page(message, status, script = "") {
  const nonce = crypto.randomUUID();
  const headers = new Headers({
    ...PRIVATE,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  });
  headers.append(
    "Set-Cookie",
    `${STATE}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
  headers.append(
    "Set-Cookie",
    `${STATE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect · Daytlas</title></head><body><main><h1>${status === 200 ? "Connecting your browser" : "We couldn’t connect to Oura"}</h1><p id="status">${message}</p><a href="/connect">Back to Daytlas</a></main>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`,
    { status, headers },
  );
}
function cookie(request) {
  const values = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(`${STATE}=`));
  return values.length === 1 ? values[0].slice(STATE.length + 1) : null;
}
async function exchange(env, fields) {
  return fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...fields,
      client_id: env.OURA_CLIENT_ID,
      client_secret: env.OURA_CLIENT_SECRET,
    }),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}
async function callback(request, env, url) {
  const state = url.searchParams.get("state");
  if (
    !state ||
    state.length > 128 ||
    url.searchParams.getAll("state").length !== 1 ||
    state !== cookie(request)
  )
    return page("This connection request expired. Please start again.", 400);
  if (url.searchParams.has("error"))
    return page(
      "Access wasn’t granted. You can try again whenever you’re ready.",
      400,
    );
  const code = url.searchParams.get("code");
  if (
    !code ||
    code.length > 8192 ||
    url.searchParams.getAll("code").length !== 1
  )
    return page(
      "The connection response was incomplete. Please start again.",
      400,
    );
  if (!configured(env))
    return page("Oura connection is not configured on this installation.", 503);
  try {
    const response = await exchange(env, {
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(env),
    });
    if (!response.ok)
      return page(
        "Oura couldn’t complete this connection. Please try again.",
        502,
      );
    const t = tokens(await response.json());
    if (!t)
      return page(
        "Oura returned an incomplete connection. Please try again.",
        502,
      );
    const payload = serialize({
      token: t.access_token,
      refresh: t.refresh_token ?? null,
      expiresAt: t.expires_in ? Date.now() + t.expires_in * 1000 : null,
    });
    return page(
      "Finishing your secure connection…",
      200,
      `
      (async () => {
        history.replaceState(null, "", "/api/auth/callback");
        try {
          const t = ${payload};
          for (const key of Object.keys(localStorage)) if (key.startsWith("daytlas.") || key.startsWith("woura.") || key === "mebyday.analytics-consent.v1") localStorage.removeItem(key);
          for (const name of ["daytlas", "woura"]) await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = resolve;
            request.onerror = request.onblocked = () => reject(new Error("Close other Daytlas tabs and try connecting again."));
          });
          localStorage.setItem("daytlas.cacheScope", crypto.randomUUID());
          if (t.refresh) localStorage.setItem("daytlas.refresh", t.refresh);
          if (t.expiresAt) localStorage.setItem("daytlas.expiresAt", String(t.expiresAt));
          localStorage.setItem("daytlas.mode", "live");
          localStorage.setItem("daytlas.token", t.token);
          location.replace("/app");
        } catch {
          try { for (const key of ["daytlas.token", "daytlas.refresh", "daytlas.expiresAt", "daytlas.cacheScope", "daytlas.mode"]) localStorage.removeItem(key); } catch {}
          document.getElementById("status").textContent = "Your browser could not save the connection or clear the previous session. Enable site storage, close other Daytlas tabs, and try again.";
        }
      })();`,
    );
  } catch {
    return page(
      "Oura is temporarily unavailable. Please try again shortly.",
      502,
    );
  }
}
async function refresh(request, env) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return json({ error: "Expected JSON" }, 415);
  let refreshToken;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Missing request body" }, 400);
    const decoder = new TextDecoder();
    let text = "",
      size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return json({ error: "Request too large" }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (
      !body ||
      typeof body.refresh_token !== "string" ||
      !body.refresh_token.trim() ||
      body.refresh_token.length > 16384
    )
      return json({ error: "Invalid refresh token" }, 400);
    refreshToken = body.refresh_token;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  try {
    const response = await exchange(env, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    if (!response.ok)
      return json(
        { error: "Connection expired. Please connect again." },
        [400, 401].includes(response.status) ? 401 : 502,
      );
    const value = tokens(await response.json());
    return value
      ? json(value)
      : json({ error: "Invalid response from Oura" }, 502);
  } catch {
    return json({ error: "Oura is temporarily unavailable" }, 502);
  }
}
async function relay(request, url) {
  const path = url.pathname.slice("/api/oura/".length);
  const match = /^v2\/(?:sandbox\/)?usercollection\/([A-Za-z0-9_]+)$/.exec(
    path,
  );
  if (!match || !COLLECTIONS.has(match[1]))
    return json({ error: "Path not allowed" }, 403);
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer \S+$/i.test(auth) || auth.length > 16400)
    return json({ error: "Authorization required" }, 401);
  const upstreamUrl = new URL(`https://api.ouraring.com/${path}`);
  for (const [key, value] of url.searchParams) {
    if (
      !PARAMETERS.has(key) ||
      value.length > 8192 ||
      upstreamUrl.searchParams.has(key)
    )
      return json({ error: "Invalid query parameters" }, 400);
    upstreamUrl.searchParams.set(key, value);
  }
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    // Workerd supports manual/follow only. Never follow an upstream redirect
    // carrying a bearer token, and never pass a redirect through to the browser.
    if (upstream.status >= 300 && upstream.status < 400)
      return json({ error: "Unexpected response from Oura" }, 502);
    const headers = new Headers({
      ...PRIVATE,
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Authorization",
    });
    const retry = upstream.headers.get("retry-after");
    if (retry) headers.set("Retry-After", retry);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return json({ error: "Oura is temporarily unavailable" }, 502);
  }
}
export async function handleOura(request, env) {
  const url = new URL(request.url);
  // Temporary recovery access on the previous address. Each origin keeps its own
  // callback, state cookie and same-origin checks; tokens never cross domains.
  if (
    configured(env) &&
    env.DAYTLAS_PREVIOUS_ORIGIN_ENABLED === "true" &&
    siteOrigin(env) === ORIGIN &&
    url.origin === PREVIOUS_ORIGIN
  ) {
    env = {
      ...env,
      PUBLIC_SITE_URL: PREVIOUS_ORIGIN,
      OURA_REDIRECT_URI: `${PREVIOUS_ORIGIN}/api/auth/callback`,
    };
  }
  const origin = siteOrigin(env);
  const login = url.pathname === "/api/auth/login";
  const isCallback = url.pathname === "/api/auth/callback";
  const isRefresh = url.pathname === "/api/auth/refresh";
  const isRelay = url.pathname.startsWith("/api/oura/");
  if (!login && !isCallback && !isRefresh && !isRelay) return null;
  const method = isRefresh ? "POST" : "GET";
  if (request.method !== method)
    return json({ error: "Method not allowed" }, 405, { Allow: method });
  if (url.origin !== origin)
    return login
      ? redirect(`${origin}/api/auth/login`)
      : json({ error: "Use the canonical site" }, 403);
  // The callback is a provider navigation, so it uses the state cookie instead.
  if (!isCallback && !sameOrigin(request, origin))
    return json({ error: "Origin not allowed" }, 403);
  if (isCallback) return callback(request, env, url);
  if (!configured(env))
    return login
      ? redirect(`${origin}/connect`)
      : json({ error: "Oura connection is not configured" }, 503);
  if (login) {
    const state = crypto.randomUUID();
    const target = new URL("https://cloud.ouraring.com/oauth/authorize");
    target.search = new URLSearchParams({
      response_type: "code",
      client_id: env.OURA_CLIENT_ID,
      redirect_uri: callbackUrl(env),
      scope: "daily heartrate workout tag session spo2 heart_health",
      state,
    }).toString();
    const response = redirect(target.toString());
    response.headers.set(
      "Set-Cookie",
      `${STATE}=${state}; Path=/api/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    );
    return response;
  }
  return isRefresh ? refresh(request, env) : relay(request, url);
}
