import type { OuraListResponse } from "./types";

// Client-side Oura API client. Talks to our stateless /api/oura proxy.
// In sandbox mode no token is needed (Oura's official fake-data endpoints).

export type OuraMode = "sandbox" | "live";

const TOKEN_KEY = "woura.token";
const MODE_KEY = "woura.mode";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return getToken() !== null;
}

export function getMode(): OuraMode {
  if (typeof window === "undefined") return "sandbox";
  return (window.localStorage.getItem(MODE_KEY) as OuraMode) ?? "sandbox";
}

export function setMode(mode: OuraMode) {
  window.localStorage.setItem(MODE_KEY, mode);
}

let refreshing: Promise<boolean> | null = null;

/** Exchange the stored refresh token for a new access token. Deduplicated. */
async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refresh_token = window.localStorage.getItem("woura.refresh");
      if (!refresh_token) return false;
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return false;
      const t = await res.json();
      setToken(t.access_token);
      if (t.refresh_token) window.localStorage.setItem("woura.refresh", t.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export class OuraApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchPage<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<OuraListResponse<T>> {
  // Live whenever a token exists; sandbox remains only as a dev fallback.
  const mode: OuraMode = getToken() ? "live" : "sandbox";
  const base = mode === "sandbox" ? "v2/sandbox/usercollection" : "v2/usercollection";
  const url = new URL(`/api/oura/${base}/${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));

  // Sandbox accepts any non-empty Authorization value.
  const token = mode === "sandbox" ? "sandbox" : getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status === 401 && mode === "live" && (await tryRefresh())) {
    return fetchPage(endpoint, params);
  }
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after") ?? "5");
    await new Promise((r) => setTimeout(r, Math.min(wait, 60) * 1000));
    return fetchPage(endpoint, params);
  }
  if (!res.ok) {
    throw new OuraApiError(res.status, `Oura API ${res.status} on ${endpoint}`);
  }
  return res.json();
}

/** Fetch all pages of a collection endpoint for a date range. */
export async function fetchAll<T>(
  endpoint: string,
  range: { start_date?: string; end_date?: string; start_datetime?: string; end_datetime?: string }
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = null;
  do {
    const page: OuraListResponse<T> = await fetchPage<T>(endpoint, {
      ...Object.fromEntries(Object.entries(range).filter(([, v]) => v)) as Record<string, string>,
      ...(next ? { next_token: next } : {}),
    });
    out.push(...page.data);
    next = page.next_token;
  } while (next);
  return out;
}
