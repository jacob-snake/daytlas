"use client";
import { useEffect, useState } from "react";
import { freePeriodRemaining, launch } from "@/lib/launch-config";

export function LaunchCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const remaining = now === null ? null : freePeriodRemaining(now);
  return (
    <section
      aria-labelledby="early-access-title"
      className="my-12 flex flex-col justify-between gap-7 rounded-[28px] border border-border bg-card p-7 sm:flex-row sm:items-center sm:p-10"
    >
      <div className="max-w-lg">
        <p className="text-sm font-semibold text-muted-foreground">
          Early access
        </p>
        <h2
          id="early-access-title"
          className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl"
        >
          {remaining?.expired
            ? "Our next chapter is taking shape."
            : `Free through ${launch.freeUntilLabel}.`}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Pricing is coming soon. We’re defining the plans and will share them
          before paid access begins. No automatic charges.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Limited early access. Oura’s membership requirements still apply.
        </p>
      </div>
      <div
        className="shrink-0"
        role="timer"
        aria-label="Time remaining in the free early-access period"
        aria-live="off"
      >
        <div className="flex gap-6 sm:gap-8">
          {(
            [
              ["days", remaining?.days],
              ["hours", remaining?.hours],
              ["minutes", remaining?.minutes],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="min-w-12 text-center">
              <div className="text-4xl font-medium tabular-nums tracking-tight sm:text-5xl">
                {value == null ? "—" : String(value).padStart(2, "0")}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Until 31 Oct, 23:59 · Prague time
        </p>
      </div>
    </section>
  );
}
