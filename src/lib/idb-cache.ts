import { LEGACY_DATABASE } from "./brand-migration";
import { brand } from "@/lib/brand-config";
// Browser-only, best-effort cache. Recent Oura records can change after syncing.
const DB_NAME = "daytlas";
const STORE = "api-cache";
const TTL_MS = 30 * 60 * 1000;
let generation = 0;

interface Entry {
  key: string;
  storedAt: number;
  data: unknown;
}

function openCurrentDb(): Promise<IDBDatabase> {
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

// Transfer browser-owned records on this origin. Nothing is uploaded, and the
// original database remains available until an explicit local-data erasure.
let migratedDatabase: Promise<void> | undefined;
async function openLegacyDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB.databases !== "function") return null;
  if (!(await indexedDB.databases()).some((db) => db.name === LEGACY_DATABASE))
    return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LEGACY_DATABASE, 1);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("Close older app tabs and try again."));
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
  });
}
async function migrateDatabase(db: IDBDatabase) {
  if (typeof indexedDB.databases !== "function") return;
  const marker = "brand-migration-complete";
  const alreadyMigrated = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(STORE);
    const req = tx.objectStore(STORE).get(marker);
    tx.oncomplete = () => resolve(Boolean(req.result));
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
  if (alreadyMigrated) return;
  const legacy = await openLegacyDb();
  if (!legacy) return;
  try {
    if (!legacy.objectStoreNames.contains(STORE)) return;
    const entries = await new Promise<Entry[]>((resolve, reject) => {
      const tx = legacy.transaction(STORE);
      const req = tx.objectStore(STORE).getAll();
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const entry of entries) {
        const req = store.get(entry.key);
        req.onsuccess = () => {
          if (!req.result) store.put(entry);
        };
      }
      store.put({ key: marker, storedAt: Date.now(), data: true });
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally {
    legacy.close();
  }
}
async function openDb(): Promise<IDBDatabase> {
  const db = await openCurrentDb();
  if (!migratedDatabase)
    migratedDatabase = migrateDatabase(db).catch((error) => {
      migratedDatabase = undefined;
      throw error;
    });
  try {
    await migratedDatabase;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function cacheGet<T>(
  key: string,
  minStoredAt = 0,
): Promise<T | null> {
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
        if (entry && entry.storedAt >= minStoredAt && age >= 0 && age < TTL_MS)
          value = entry.data as T;
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
    const legacy = await openLegacyDb();
    if (legacy) {
      try {
        if (legacy.objectStoreNames.contains(STORE))
          await new Promise<void>((resolve, reject) => {
            const tx = legacy.transaction(STORE, "readwrite");
            tx.objectStore(STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () =>
              reject(
                new Error(
                  "The older local copy could not be erased. Close other tabs and try again.",
                ),
              );
          });
      } finally {
        legacy.close();
      }
    }
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
