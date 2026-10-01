/** Connection-scoped request status. This is an Oura API update, not Bluetooth sync. */
export interface SyncState {
  pending: number;
  updatedAt: number | null;
  failed: boolean;
}
const empty: SyncState = { pending: 0, updatedAt: null, failed: false };
const states = new Map<string, SyncState>();
const listeners = new Set<() => void>();
let revision = 0;
let freshAfter = 0;
const refreshListeners = new Set<() => void>();
export const subscribeSync = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const subscribeRefresh = (listener: () => void) => {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
};
export const getRefreshRevision = () => revision;
export const getFreshAfter = () => freshAfter;
export const serverSyncSnapshot = () => empty;

export function getSyncState(scope: string): SyncState {
  if (!states.has(scope)) {
    let saved: Partial<SyncState> = {};
    try {
      saved = JSON.parse(
        window.localStorage.getItem(`daytlas.sync:${scope}`) || "{}",
      );
    } catch {}
    states.set(scope, {
      ...empty,
      updatedAt:
        typeof saved?.updatedAt === "number" &&
        saved.updatedAt > 0 &&
        saved.updatedAt <= Date.now()
          ? saved.updatedAt
          : null,
      failed: saved?.failed === true,
    });
  }
  return states.get(scope)!;
}
function update(scope: string, value: SyncState) {
  states.set(scope, value);
  try {
    window.localStorage.setItem(
      `daytlas.sync:${scope}`,
      JSON.stringify({ updatedAt: value.updatedAt, failed: value.failed }),
    );
  } catch {}
  listeners.forEach((listener) => listener());
}
export function beginSync(scope: string) {
  const state = getSyncState(scope);
  update(scope, { ...state, pending: state.pending + 1 });
}
export function finishSync(scope: string, success: boolean) {
  const state = getSyncState(scope);
  update(scope, {
    pending: Math.max(0, state.pending - 1),
    updatedAt: success ? Date.now() : state.updatedAt,
    failed: state.failed || !success,
  });
}
/** Keep cached history intact; refetch mounted queries and bypass older cache entries. */
export function refreshOura(scope: string) {
  if (getSyncState(scope).pending) return;
  freshAfter = Date.now();
  revision += 1;
  update(scope, { ...getSyncState(scope), failed: false });
  refreshListeners.forEach((listener) => listener());
}
