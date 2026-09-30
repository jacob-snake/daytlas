"use client";
import { brand } from "@/lib/brand-config";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  disconnectAndClear,
  hasToken,
  getMode,
  reloadSession,
} from "@/lib/oura/client";

const subscribe = () => () => {};
export function AppFooter() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const connected = useSyncExternalStore(
    subscribe,
    () => hasToken() || getMode() === "import",
    () => false,
  );
  async function disconnect() {
    setBusy(true);
    try {
      await disconnectAndClear();
      reloadSession();
    } catch {
      reloadSession("/?clear=failed");
    }
  }
  return (
    <>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border/40 py-5 text-[13px] font-medium text-muted-foreground">
        <Link
          href="/"
          className="min-h-11 content-center font-semibold text-foreground"
        >
          {brand.name}
        </Link>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5"
        >
          {[
            ["/privacy", "Privacy"],
            ["/terms", "Terms"],
            ["/install", "Add to home screen"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="min-h-11 content-center hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          {connected && (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Disconnect & clear local data
            </Button>
          )}
        </nav>
      </footer>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this browser?</DialogTitle>
            <DialogDescription>
              This removes your saved connection, cached health data, imported
              records and {brand.name}
              preferences from this browser. Your records in Oura stay intact.
              To revoke the app’s access at Oura too, visit your Oura account
              settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Keep connection
            </Button>
            <Button variant="destructive" onClick={disconnect} disabled={busy}>
              {busy ? "Clearing…" : "Disconnect & clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
