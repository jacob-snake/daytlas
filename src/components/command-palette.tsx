"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cacheClear } from "@/lib/idb-cache";
import { METRICS } from "@/lib/oura/metrics";

export function CommandPalette({
  onAddChart,
}: {
  /** Present on Trends — adds a metric chart directly. */
  onAddChart?: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Search pages and metrics">
      <CommandInput placeholder="Search pages, metrics, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => run(() => router.push("/"))}>Dashboard</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/trends"))}>Trends</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/year"))}>Year</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/tags"))}>Tag Lab</CommandItem>
        </CommandGroup>
        {onAddChart && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Add chart">
              {METRICS.map((m) => (
                <CommandItem key={m.key} onSelect={() => run(() => onAddChart(m.key))}>
                  {m.label}
                  <span className="ml-auto text-xs text-muted-foreground">{m.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Privacy">
          <CommandItem
            onSelect={() =>
              run(async () => {
                await cacheClear();
                toast.success("Local cache wiped");
              })
            }
          >
            Wipe locally cached data
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
