"use client";
import { RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useOuraSession } from "@/lib/use-oura-query";
import { getCacheScope } from "@/lib/oura/client";
import {
  getSyncState,
  refreshOura,
  serverSyncSnapshot,
  subscribeSync,
} from "@/lib/oura/sync-state";
import { Button } from "@/components/ui/button";

export function OuraSyncStatus() {
  const session = useOuraSession();
  const live = session?.startsWith("live:");
  const scope = live ? getCacheScope() : "";
  const state = useSyncExternalStore(
    subscribeSync,
    () => (scope ? getSyncState(scope) : serverSyncSnapshot()),
    serverSyncSnapshot,
  );
  if (!session) return null;
  const date = state.updatedAt ? new Date(state.updatedAt) : null;
  const today = date?.toDateString() === new Date().toDateString();
  const time = date?.toLocaleString("en-GB", {
    ...(today ? {} : ({ day: "numeric", month: "short" } as const)),
    hour: "2-digit",
    minute: "2-digit",
  });
  const label = !live
    ? session === "demo"
      ? "Demo data"
      : "Imported data"
    : state.pending
      ? "Updating ring data…"
      : state.failed
        ? "Update incomplete"
        : date
          ? `Ring data synced ${time}`
          : "Oura connected";
  return (
    <div
      className="flex min-h-9 items-center justify-end gap-2 text-xs text-muted-foreground"
      data-testid="oura-sync-status"
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${live && !state.pending && !state.failed && date ? "bg-emerald-600" : state.failed ? "bg-amber-600" : "bg-muted-foreground/50"}`}
      />
      <span
        role="status"
        title={
          live
            ? "Last data update from Oura to Daytlas. Sync your ring in the Oura app first."
            : undefined
        }
      >
        {label}
      </span>
      {live && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={state.pending > 0}
          onClick={() => refreshOura(scope)}
          aria-label="Refresh data from Oura"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-3.5 ${state.pending ? "motion-safe:animate-spin" : ""}`}
          />
        </Button>
      )}
    </div>
  );
}
