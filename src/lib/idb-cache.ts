// Minimal IndexedDB cache for Oura API responses. Health history is
// immutable once synced, so a short TTL gives instant loads without
// risking stale recent days. No external dependency.

const DB_NAME = "woura";
const STORE = "api-cache";
const TTL_MS = 30 * 60 * 1000;

interface Entry {
  key: string;
  storedAt: number;
  data: unknown;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result as Entry | undefined;
        resolve(entry && Date.now() - entry.storedAt < TTL_MS ? (entry.data as T) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put({ key, storedAt: Date.now(), data } satisfies Entry);
  } catch {
    // Cache is best-effort; failures fall through to network.
  }
}

/** Wipe all locally cached API data (privacy: one-click local delete). */
export async function cacheClear(): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(STORE, "readwrite").objectStore(STORE).clear();
  } catch {
    /* noop */
  }
}
