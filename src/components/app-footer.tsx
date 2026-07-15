"use client";

import Link from "next/link";
import { Coffee, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cacheClear } from "@/lib/idb-cache";
import pkg from "../../package.json";

export function AppFooter() {
  return (
    <footer className="mt-12 border-t pt-6 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>
          Woura · open source · your data never leaves this browser ·{" "}
          <a
            href="https://github.com/hadjakub/woura/releases"
            target="_blank"
            rel="noreferrer"
            className="tabular-nums underline-offset-2 hover:underline"
            title="Check for newer versions on GitHub — Woura never phones home"
          >
            v{pkg.version}
          </a>
        </p>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="xs">
            <Link href="/privacy">Privacy</Link>
          </Button>
          <Button asChild variant="ghost" size="xs">
            <Link href="/terms">Terms</Link>
          </Button>
          <Button asChild variant="outline" size="xs">
            <a href="https://buymeacoffee.com/hadjakub" target="_blank" rel="noreferrer">
              <Coffee data-icon="inline-start" /> Buy me a coffee
            </a>
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Button
            variant="ghost"
            size="xs"
            onClick={async () => {
              await cacheClear();
              toast.success("All locally cached data wiped");
            }}
          >
            <Trash2 data-icon="inline-start" /> Wipe local data
          </Button>
        </div>
      </div>
    </footer>
  );
}
