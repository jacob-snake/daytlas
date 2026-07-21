"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/icon";
import {
  DashboardSpeed01Icon,
  ChartLineData01Icon,
  CircleIcon,
  FlaskConicalIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "dashboard", label: "Dashboard", icon: DashboardSpeed01Icon },
  { href: "/trends", key: "trends", label: "Trends", icon: ChartLineData01Icon },
  { href: "/year", key: "year", label: "Year", icon: CircleIcon },
  { href: "/tags", key: "tags", label: "Tag Lab", icon: FlaskConicalIcon },
] as const;

export function AppHeader({ active }: { active: "dashboard" | "trends" | "year" | "tags" }) {
  return (
    <header className="sticky top-2 z-20 mx-auto w-fit max-w-full rounded-full border bg-background/70 px-2 shadow-[var(--shadow-border)] backdrop-blur-xl sm:top-4 sm:px-3">
      <div className="flex h-11 items-center gap-1.5 sm:h-12 sm:gap-3">
        <Link href="/" className="pl-1.5 text-base font-bold tracking-tight sm:pl-2 sm:text-lg">
          Woura
        </Link>
        <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Local only
        </Badge>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <nav className="flex items-center gap-0.5 overflow-x-auto sm:gap-1">
          {NAV.map((item) => (
            <Button
              key={item.key}
              asChild
              variant="ghost"
              size="sm"
              className={cn("shrink-0 px-2 sm:px-2.5", active === item.key && "bg-muted font-semibold")}
            >
              <Link href={item.href}>
                <Icon icon={item.icon} className="size-4 sm:hidden" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>
        <button
          className="hidden cursor-pointer rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-foreground hover:text-background md:inline-block"
          title="Command palette — search pages, metrics, actions"
          aria-label="Open command palette"
          onClick={() => window.dispatchEvent(new CustomEvent("woura:cmdk"))}
        >
          ⌘K
        </button>
      </div>
    </header>
  );
}
