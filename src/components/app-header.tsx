"use client";

import Link from "next/link";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function AppHeader({ active }: { active: "dashboard" | "trends" | "year" | "tags" }) {
  return (
    <header className="sticky top-4 z-20 mx-auto w-fit max-w-full rounded-full border bg-background/70 px-3 shadow-[var(--shadow-border)] backdrop-blur-xl">
      <div className="flex h-12 items-center gap-3">
        <Link href="/" className="pl-2 text-lg font-bold tracking-tight">
          Woura
        </Link>
        <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Local only
        </Badge>
        <Separator orientation="vertical" className="h-6" />
        <nav className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(active === "dashboard" && "bg-muted font-semibold")}
          >
            <Link href="/">Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(active === "trends" && "bg-muted font-semibold")}
          >
            <Link href="/trends">Trends</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(active === "year" && "bg-muted font-semibold")}
          >
            <Link href="/year">Year</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(active === "tags" && "bg-muted font-semibold")}
          >
            <Link href="/tags">Tag Lab</Link>
          </Button>
        </nav>
        <kbd
          className="hidden rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-block"
          title="Command palette — search pages, metrics, actions"
        >
          ⌘K
        </kbd>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href="https://buymeacoffee.com/hadjakub" target="_blank" rel="noreferrer">
            <Coffee data-icon="inline-start" /> Buy me a coffee
          </a>
        </Button>
      </div>
    </header>
  );
}
