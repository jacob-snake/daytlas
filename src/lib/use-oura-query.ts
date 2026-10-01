"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getRefreshRevision, subscribeRefresh } from "./oura/sync-state";
import { getCacheScope, getMode, hasSession } from "./oura/client";

function subscribeSession(changed: () => void) {
  window.addEventListener("storage", changed);
  window.addEventListener("daytlas:session", changed);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener("daytlas:session", changed);
  };
}

function sessionSnapshot(): string | null {
  // Erasure failures must never reopen the previous dashboard on the landing URL.
  if (new URLSearchParams(window.location.search).get("clear") === "failed")
    return null;
  if (!hasSession()) return null;
  if (getMode() === "demo") return "demo";
  if (getMode() === "import") return getCacheScope();
  try {
    return `live:${window.localStorage.getItem("daytlas.cacheScope") ?? "legacy"}`;
  } catch {
    return null;
  }
}

/** Server and first hydration agree; the browser then reads its own connection. */
export function useOuraSession() {
  return useSyncExternalStore(subscribeSession, sessionSnapshot, () => null);
}

interface QueryResult<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/** Results belong to their request key; changing it never displays old data. */
export function useOuraQuery<T>(
  requestKey: string | null,
  load: () => Promise<T>,
) {
  const revision = useSyncExternalStore(
    subscribeRefresh,
    getRefreshRevision,
    () => 0,
  );
  const key = requestKey === null ? null : `${requestKey}:refresh:${revision}`;
  const [result, setResult] = useState<QueryResult<T> | null>(null);
  useEffect(() => {
    if (key === null) return;
    let active = true;
    load().then(
      (data) => {
        if (active) setResult({ key, data, error: null });
      },
      (error: unknown) => {
        if (active)
          setResult({
            key,
            data: null,
            error: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [key, load]);
  const current = key !== null && result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
  };
}
