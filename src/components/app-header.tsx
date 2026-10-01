"use client";
import Link from "next/link";
import { UserRound, Menu, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getMode, hasToken, setMode, reloadSession } from "@/lib/oura/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/day", key: "day", label: "Day detail" },
  { href: "/app", key: "dashboard", label: "Overview" },
  { href: "/app/trends", key: "trends", label: "Trends" },
  { href: "/app/year", key: "year", label: "Your year" },
  { href: "/app/tags", key: "tags", label: "Tag Lab" },
] as const;
const subscribe = () => () => {};
export function AppHeader({
  active,
}: {
  active: "day" | "dashboard" | "trends" | "year" | "tags" | "profile";
}) {
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    let previous = window.scrollY,
      travel = 0,
      frame = 0;
    const update = () => {
      const next = Math.max(0, window.scrollY);
      const delta = next - previous;
      if (Math.abs(delta) >= 2) {
        travel =
          Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
        if (next < 100 || travel < -36 || menuOpen) setHidden(false);
        else if (
          travel > 64 &&
          !header.current?.contains(document.activeElement)
        )
          setHidden(true);
        previous = next;
      }
    };
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, [menuOpen]);
  useEffect(() => {
    const node = header.current;
    const main = node?.closest("main");
    if (!node || !main) return;
    const update = () =>
      main.style.setProperty(
        "--app-header-offset",
        hidden
          ? "0px"
          : `${node.offsetHeight + (innerWidth >= 640 ? 20 : 12)}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, [hidden]);
  const demo = useSyncExternalStore(
    subscribe,
    () => getMode() === "demo",
    () => false,
  );
  const imported = useSyncExternalStore(
    subscribe,
    () => getMode() === "import",
    () => false,
  );
  return (
    <>
      <header
        ref={header}
        onFocusCapture={() => setHidden(false)}
        data-hidden={hidden}
        className="motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] data-[hidden=true]:-translate-y-[calc(100%+2rem)] app-header sticky top-3 z-40 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-border)] sm:top-5 sm:px-5"
      >
        <div className="flex items-center justify-between gap-3">
          <Brand revealWebsite />
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 min-[1100px]:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active === item.key ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center px-3 pb-1 text-sm font-medium transition-colors",
                  active === item.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active === item.key && (
                  <span className="brand-nav-orb" aria-hidden="true" />
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 min-[1100px]:ml-0">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="brand-profile-orb"
            >
              <Link
                href="/app/profile"
                aria-label="Your profile"
                title="Your profile"
                aria-current={active === "profile" ? "page" : undefined}
                className="aria-[current=page]:bg-muted"
              >
                <UserRound className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <Dialog
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (open) setHidden(false);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-[1100px]:hidden"
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-4 translate-y-0 rounded-3xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Navigation</DialogTitle>
              </DialogHeader>
              <nav
                aria-label="Mobile main navigation"
                className="flex flex-col gap-1"
              >
                {[
                  ...NAV,
                  {
                    href: "/app/profile",
                    key: "profile",
                    label: "Your profile",
                  },
                ].map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active === item.key ? "page" : undefined}
                    className="rounded-xl px-4 py-3 text-base font-medium hover:bg-muted aria-[current=page]:bg-secondary aria-[current=page]:font-semibold"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/"
                  className="mt-3 flex items-center gap-3 border-t border-border/40 px-4 py-4 text-sm text-muted-foreground"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back to
                  website
                </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      {imported && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-4 py-3 text-sm">
          <p>
            <strong>Imported Oura data.</strong> Updates when you upload another
            file.
          </p>
          <Link
            href="/connect#import"
            className="font-semibold underline underline-offset-4"
          >
            Update import
          </Link>
        </div>
      )}
      {demo && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-secondary px-4 py-2 text-xs">
          <p>
            <span className="font-semibold">You’re exploring the demo.</span>{" "}
            <span className="text-muted-foreground">
              All data is fictional.
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode(hasToken() ? "live" : "sandbox");
              reloadSession(hasToken() ? "/app" : "/");
            }}
          >
            Exit demo
          </Button>
        </div>
      )}
    </>
  );
}
