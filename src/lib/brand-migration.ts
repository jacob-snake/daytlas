/** Compatibility reads only. New data always uses the approved Daytlas identity. */
export const LEGACY_STORAGE_PREFIX = "woura.";
export const LEGACY_DATABASE = "woura";
export const LEGACY_ANALYTICS_CONSENT = "mebyday.analytics-consent.v1";
const SESSION_FIELDS = new Set([
  "token",
  "refresh",
  "expiresAt",
  "cacheScope",
  "mode",
  "importRevision",
]);
const MARKER = "daytlas.brand-migration.v1";

export function migrateBrowserStorage(storage: Storage): boolean {
  const created: [string, string][] = [];
  let committed = false;
  try {
    if (storage.getItem(MARKER) === "complete") return true;
    const legacy = Object.keys(storage)
      .filter(
        (key) =>
          key.startsWith(LEGACY_STORAGE_PREFIX) ||
          key === LEGACY_ANALYTICS_CONSENT,
      )
      .map((key) => [key, storage.getItem(key)] as const);
    const hasCurrentSession = [...SESSION_FIELDS].some(
      (field) => storage.getItem(`daytlas.${field}`) !== null,
    );
    for (const [key, value] of legacy) {
      if (
        hasCurrentSession &&
        SESSION_FIELDS.has(key.slice(LEGACY_STORAGE_PREFIX.length))
      )
        continue;
      if (value === null) continue;
      const next =
        key === LEGACY_ANALYTICS_CONSENT
          ? "daytlas.analytics-consent.v1"
          : `daytlas.${key.slice(LEGACY_STORAGE_PREFIX.length)}`;
      // A connection already made in Daytlas wins over an older saved connection.
      if (storage.getItem(next) === null) {
        storage.setItem(next, value);
        created.push([next, value]);
      }
    }
    storage.setItem(MARKER, "complete");
    committed = true;
    for (const [key, value] of legacy)
      if (storage.getItem(key) === value) storage.removeItem(key);
    return true;
  } catch {
    // Roll back this attempt so a retry cannot mix two connections.
    for (const [key, value] of committed ? [] : created) {
      try {
        if (storage.getItem(key) === value) storage.removeItem(key);
      } catch {}
    }
    // Do not erase the original copy if browser storage is blocked or full.
    return false;
  }
}

export function hasLegacyConnection(
  storage: Pick<Storage, "getItem">,
): boolean {
  return Boolean(
    storage.getItem(`${LEGACY_STORAGE_PREFIX}token`) ||
    storage.getItem(`${LEGACY_STORAGE_PREFIX}refresh`) ||
    storage.getItem(`${LEGACY_STORAGE_PREFIX}importRevision`) ||
    (storage.getItem(`${LEGACY_STORAGE_PREFIX}mode`) &&
      storage.getItem(`${LEGACY_STORAGE_PREFIX}mode`) !== "demo"),
  );
}
