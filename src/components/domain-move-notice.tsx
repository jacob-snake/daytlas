"use client";

import { useSyncExternalStore } from "react";
import { brand } from "@/lib/brand-config";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Keep the old browser's history accessible while people move to the new address. */
export function DomainMoveNotice() {
  const previousAddress = useSyncExternalStore(
    subscribe,
    () => ["mebyday.com", "www.mebyday.com"].includes(window.location.hostname),
    () => false,
  );
  if (!previousAddress) return null;

  return (
    <aside
      aria-label="Daytlas has a new address"
      className="border-b bg-muted/50 px-4 py-4 text-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="font-semibold">Daytlas is now at {brand.domain}.</p>
          <p className="text-muted-foreground">
            Your history is still available here. At the new address, reconnect
            Oura or import your file. Saved history and preferences do not move
            automatically.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/app/profile">Export your history</a>
          </Button>
          <Button asChild size="sm">
            <a href={brand.publicUrl}>Open {brand.name}</a>
          </Button>
        </div>
      </div>
    </aside>
  );
}
