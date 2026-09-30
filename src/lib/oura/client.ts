import { brand } from "@/lib/brand-config";
import { cacheClear, cacheGet, cacheSet } from "@/lib/idb-cache";
import type { OuraListResponse } from "./types";
import { collectionRange, inCalendarRange } from "./date-range";

export type OuraMode = "demo" | "sandbox" | "live" | "import";
export interface OuraRange {
  start_date?: string;
  end_date?: string;
  start_datetime?: string;
  end_datetime?: string;
}

const TOKEN_KEY = "woura.token";
const MODE_KEY = "woura.mode";
const SCOPE_KEY = "woura.cacheScope";
const MAX_RATE_RETRIES = 3;
const MAX_PAGES = 1_000;
const pending = new Map<string, Promise<unknown[]>>();

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return readStorage(TOKEN_KEY)?.trim() || null;
}

export function setToken(token: string | null) {
  const storage = window.localStorage;
  if (token?.trim()) {
    if (token !== getToken()) {
      storage.setItem(SCOPE_KEY, crypto.randomUUID());
      storage.removeItem("woura.refresh");
      storage.removeItem("woura.expiresAt");
    }
    storage.setItem(TOKEN_KEY, token);
  } else {
    for (const key of [
      TOKEN_KEY,
      "woura.refresh",
      "woura.expiresAt",
      SCOPE_KEY,
    ])
      storage.removeItem(key);
  }
}

export function hasToken(): boolean {
  return getToken() !== null;
}
export function hasSession(): boolean {
  return (
    getMode() === "import" ||
    getMode() === "demo" ||
    (getMode() === "live" && hasToken())
  );
}

export function getMode(): OuraMode {
  const mode = readStorage(MODE_KEY);
  if (mode === "import") return "import";
  if (mode === "demo") return "demo";
  if (mode === "sandbox") return "sandbox";
  return hasToken() ? "live" : "sandbox";
}

export function setMode(mode: OuraMode) {
  window.localStorage.setItem(MODE_KEY, mode);
}

/** A document navigation deliberately drops all React-held health data. */
export function reloadSession(path: "/" | "/app" | "/?clear=failed" = "/") {
  window.location.assign(path);
}

/** Random per-connection scope: never put credentials in cache keys. */
export function getCacheScope(): string {
  const mode = getMode();
  if (mode === "import")
    return `import:${readStorage("woura.importRevision") ?? "history"}`;
  if (mode !== "live") return mode;
  let scope = readStorage(SCOPE_KEY);
  if (!scope) {
    scope = crypto.randomUUID();
    window.localStorage.setItem(SCOPE_KEY, scope);
  }
  return `live:${scope}`;
}

/** Disconnect locally, remove preferences and credentials, and await cache erasure. */
export async function disconnectAndClear(): Promise<void> {
  const storage = window.localStorage;
  for (const key of Object.keys(storage))
    if (key.startsWith("woura.")) storage.removeItem(key);
  pending.clear();
  await cacheClear();
}

export class OuraApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OuraApiError";
  }
}

function assertSession(scope: string) {
  if (getCacheScope() !== scope)
    throw new OuraApiError(
      401,
      `Your connection changed. Reload ${brand.name} to continue.`,
    );
}

let refreshing: { scope: string; promise: Promise<boolean> } | null = null;

/** Refresh once for simultaneous callers; never restore a disconnected session. */
async function tryRefresh(scope: string): Promise<boolean> {
  if (refreshing?.scope === scope) return refreshing.promise;
  const promise = (async () => {
    try {
      const refreshToken = readStorage("woura.refresh");
      if (!refreshToken) return false;
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return false;
      const tokens = await res.json();
      if (
        typeof tokens.access_token !== "string" ||
        !tokens.access_token.trim()
      )
        return false;
      assertSession(scope);
      if (readStorage("woura.refresh") !== refreshToken) return false;
      // Refresh keeps the same connection and its isolated cache scope.
      window.localStorage.setItem(TOKEN_KEY, tokens.access_token);
      if (typeof tokens.refresh_token === "string" && tokens.refresh_token)
        window.localStorage.setItem("woura.refresh", tokens.refresh_token);
      if (typeof tokens.expires_in === "number" && tokens.expires_in > 0)
        window.localStorage.setItem(
          "woura.expiresAt",
          String(Date.now() + tokens.expires_in * 1000),
        );
      else window.localStorage.removeItem("woura.expiresAt");
      return true;
    } catch {
      return false;
    }
  })();
  refreshing = { scope, promise };
  try {
    return await promise;
  } finally {
    if (refreshing?.promise === promise) refreshing = null;
  }
}

function retryDelay(header: string | null, attempt: number): number {
  if (header) {
    const seconds = Number(header);
    const milliseconds = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    if (Number.isFinite(milliseconds))
      return Math.max(250, Math.min(milliseconds, 30_000));
  }
  return Math.min(1_000 * 2 ** attempt, 30_000);
}

async function fetchPage<T>(
  endpoint: string,
  params: Record<string, string>,
  scope: string,
): Promise<OuraListResponse<T>> {
  const mode = getMode();
  const base =
    mode === "sandbox" ? "v2/sandbox/usercollection" : "v2/usercollection";
  const url = new URL(`/api/oura/${base}/${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  let refreshed = false;
  let rateRetries = 0;
  for (;;) {
    assertSession(scope);
    const token = mode === "sandbox" ? "sandbox" : getToken();
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new OuraApiError(
        0,
        "Could not reach Oura. Check your connection and try again.",
      );
    }
    assertSession(scope);
    if (res.status === 401 && mode === "live" && !refreshed) {
      refreshed = true;
      if (getToken() !== token || (await tryRefresh(scope))) continue;
    }
    if (res.status === 429 && rateRetries < MAX_RATE_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          retryDelay(res.headers.get("retry-after"), rateRetries++),
        ),
      );
      continue;
    }
    if (!res.ok) {
      const message =
        (res.status === 401 || res.status === 403) &&
        endpoint === "daily_cardiovascular_age"
          ? "Oura did not authorise Heart health access. Reconnect and enable Heart health to load cardiovascular age."
          : res.status === 401
            ? "Your Oura connection expired. Connect again to continue."
            : res.status === 403
              ? "Oura did not allow access. Check your membership and connection permissions."
              : res.status === 429
                ? "Oura is receiving too many requests. Please try again shortly."
                : "Oura is temporarily unavailable. Please try again.";
      throw new OuraApiError(res.status, message);
    }
    let page: OuraListResponse<T>;
    try {
      page = await res.json();
    } catch {
      throw new OuraApiError(
        502,
        "Oura returned an unreadable response. Please try again.",
      );
    }
    if (
      !page ||
      !Array.isArray(page.data) ||
      (page.next_token != null && typeof page.next_token !== "string")
    ) {
      throw new OuraApiError(
        502,
        "Oura returned an unexpected response. Please try again.",
      );
    }
    return page;
  }
}

/** Fetch a complete collection. Demo data stays entirely in this browser. */
export async function fetchAll<T>(
  endpoint: string,
  range: OuraRange,
  options: { fresh?: boolean } = {},
): Promise<T[]> {
  if (!/^[a-zA-Z0-9_]+$/.test(endpoint))
    throw new OuraApiError(400, "Invalid collection.");
  if (getMode() === "import") {
    const { importedData } = await import("@/lib/idb-cache");
    const data = await importedData<import("./import-file").OuraImport>();
    if (!data)
      throw new OuraApiError(
        404,
        "Imported history is no longer in this browser. Import your file again.",
      );
    return (data.collections[endpoint] ?? []).filter(
      (row) =>
        (!range.start_date || row.day >= range.start_date) &&
        (!range.end_date || row.day <= range.end_date),
    ) as T[];
  }
  if (getMode() === "demo") {
    const { getDemoCollection } = await import("@/lib/demo-data");
    return getDemoCollection<T>(endpoint, range);
  }
  if (!hasToken() && readStorage(MODE_KEY) !== "sandbox")
    throw new OuraApiError(401, "Connect Oura or open the demo to continue.");
  const scope = getCacheScope();
  const params = Object.fromEntries(
    Object.entries(collectionRange(endpoint, range))
      .filter(([, value]) => value)
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, string>;
  const cacheKey = `${scope}|inclusive-v2|${endpoint}|${JSON.stringify(params)}`;
  const pendingKey = `${cacheKey}|${options.fresh ? "fresh" : "cached"}`;
  const existing = pending.get(pendingKey);
  if (existing) return existing as Promise<T[]>;
  const operation = (async () => {
    const cached = options.fresh ? null : await cacheGet<T[]>(cacheKey);
    assertSession(scope);
    if (cached) return cached;
    const out: T[] = [];
    const seen = new Set<string>();
    let next: string | null = null;
    let count = 0;
    do {
      if (++count > MAX_PAGES)
        throw new OuraApiError(
          502,
          "This date range is too large. Try a shorter range.",
        );
      const page: OuraListResponse<T> = await fetchPage<T>(
        endpoint,
        { ...params, ...(next ? { next_token: next } : {}) },
        scope,
      );
      out.push(...page.data.filter((row) => inCalendarRange(row, range)));
      next = page.next_token || null;
      if (next && seen.has(next))
        throw new OuraApiError(502, "Oura repeated a page. Please try again.");
      if (next) seen.add(next);
    } while (next);
    assertSession(scope);
    await cacheSet(cacheKey, out);
    assertSession(scope);
    return out;
  })();
  pending.set(pendingKey, operation);
  try {
    return await operation;
  } finally {
    if (pending.get(pendingKey) === operation) pending.delete(pendingKey);
  }
}
