import { brand } from "@/lib/brand-config";
// Browser-only, best-effort cache. Recent Oura records can change after syncing.
const DB_NAME = "woura";
const STORE = "api-cache";
const TTL_MS = 30 * 60 * 1000;
let generation = 0;

interface Entry {
  key: string;
  storedAt: number;
  data: unknown;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => {
      const db = req.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      blocked = true;
      reject(new Error(`Close other ${brand.name} tabs and try again.`));
    };
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  let db: IDBDatabase | undefined;
  const started = generation;
  try {
    db = await openDb();
    return await new Promise((resolve) => {
      const transaction = db!.transaction(STORE);
      const req = transaction.objectStore(STORE).get(key);
      let value: T | null = null;
      req.onsuccess = () => {
        const entry = req.result as Entry | undefined;
        const age = entry ? Date.now() - entry.storedAt : -1;
        if (entry && age >= 0 && age < TTL_MS) value = entry.data as T;
      };
      transaction.oncomplete = () =>
        resolve(started === generation ? value : null);
      transaction.onerror = transaction.onabort = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export async function cacheSet(key: string, data: unknown): Promise<void> {
  let db: IDBDatabase | undefined;
  const started = generation;
  try {
    db = await openDb();
    if (started !== generation) return;
    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction(STORE, "readwrite");
      transaction
        .objectStore(STORE)
        .put({ key, storedAt: Date.now(), data } satisfies Entry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(transaction.error);
    });
  } catch {
    // Private mode and quota failures must not prevent use of fresh data.
  } finally {
    db?.close();
  }
}

/** Resolves only when erasure commits. Unlike ordinary caching, errors matter. */
export async function cacheClear(): Promise<void> {
  generation += 1;
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(
          new Error(
            `Local data could not be erased. Close other ${brand.name} tabs and try again.`,
          ),
        );
    });
  } finally {
    db.close();
  }
}

/** Imported records are durable user data, never subject to the API cache TTL. */
export async function importedData<T>(value?: T): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(
        STORE,
        value === undefined ? "readonly" : "readwrite",
      );
      const store = tx.objectStore(STORE);
      let result: T | null = null;
      if (value === undefined) {
        const request = store.get("imported-history");
        request.onsuccess = () => {
          result = request.result?.data ?? null;
        };
      } else
        store.put({
          key: "imported-history",
          data: value,
          storedAt: Date.now(),
        });
      tx.oncomplete = () => resolve(value ?? result);
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "Imported data could not be saved. Check browser storage and try again.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
