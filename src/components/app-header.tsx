"use client";

import Link from "next/link";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function AppHeader({ active }: { active: "dashboard" | "trends" }) {
  return (
    <header className="sticky top-0 z-20 -mx-6 border-b bg-background/80 px-6 backdrop-blur md:-mx-10 md:px-10">
      <div className="flex h-14 items-center gap-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
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
        </nav>
        <div className="ml-auto">
          <Button asChild variant="outline" size="sm">
            <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer">
              <Coffee data-icon="inline-start" /> Buy me a coffee
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
