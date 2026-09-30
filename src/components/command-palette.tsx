"use client";
import { brand } from "@/lib/brand-config";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
    const open = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("woura:cmdk", open);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("woura:cmdk", open);
    };
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search pages and metrics"
    >
      <CommandInput placeholder="Search pages, metrics, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => run(() => router.push("/app/profile"))}>
            Your profile
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/"))}>
            {brand.name} website
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app"))}>
            Overview
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/trends"))}>
            Trends
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/year"))}>
            Your year
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/tags"))}>
            Tag Lab
          </CommandItem>
        </CommandGroup>
        {onAddChart && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Add chart">
              {METRICS.map((m) => (
                <CommandItem
                  key={m.key}
                  onSelect={() => run(() => onAddChart(m.key))}
                >
                  {m.label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {m.group}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Privacy & connection">
          <CommandItem onSelect={() => run(() => router.push("/privacy"))}>
            Privacy and local data
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/connect"))}>
            Manage Oura connection
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
