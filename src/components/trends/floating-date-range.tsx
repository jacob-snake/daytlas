"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Period } from "@/lib/oura/metrics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FloatingDateRange({
  children,
  editor,
  summary,
  ready,
  period,
  onPeriodChange,
}: {
  children: ReactNode;
  editor: ReactNode;
  summary: string;
  ready: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setAway(!entry.isIntersecting && entry.boundingClientRect.bottom < 0),
    );
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const main = panel.current?.closest("main");
    if (!main) return;
    const update = () =>
      main.style.setProperty(
        "--trend-toolbar-height",
        ready && away
          ? `${(toolbar.current?.offsetHeight ?? 68) + 12}px`
          : "0px",
      );
    const observer = new ResizeObserver(update);
    if (toolbar.current) observer.observe(toolbar.current);
    update();
    return () => {
      observer.disconnect();
      main.style.setProperty("--trend-toolbar-height", "0px");
    };
  }, [ready, away]);
  return (
    <>
      <div ref={panel}>
        <Card aria-label="Chart date range">{children}</Card>
      </div>
      {ready && away && (
        <div
          ref={toolbar}
          style={{
            transform:
              "translateY(calc(var(--app-header-offset, 0px) + var(--trend-navigation-height, 0px)))",
          }}
          className="fixed inset-x-4 top-3 !mt-0 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-[var(--ds-radius-card)] border border-border/70 bg-background p-3 shadow-lg motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          <TrendsRangeControls
            summary={summary}
            period={period}
            onPeriodChange={onPeriodChange}
            editor={editor}
          />
        </div>
      )}
    </>
  );
}

/** Render inside the active chart dialog too, so its focus trap includes controls. */
export function TrendsRangeControls({
  summary,
  period,
  onPeriodChange,
  editor,
}: {
  summary: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
  editor: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const summaryId = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        role="group"
        aria-label="Global Trends date range"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
      >
        <div className="flex w-fit min-w-0 max-w-full items-center gap-2 rounded-2xl bg-secondary/50 p-1 pr-3">
          <Button
            ref={trigger}
            aria-describedby={summaryId}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="min-h-11 shrink-0 rounded-xl px-3"
            onClick={() => setOpen(true)}
          >
            Edit dates
          </Button>
          <div id={summaryId} className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">
              Date range
            </p>
            <p className="text-[12px] font-semibold tabular-nums sm:text-sm">
              {summary}
            </p>
          </div>
        </div>
        <Select
          value={period}
          onValueChange={(value) => onPeriodChange(value as Period)}
        >
          <SelectTrigger
            aria-label="View all charts by period"
            className="w-auto min-w-24 rounded-xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["daily", "weekly", "monthly", "quarterly", "yearly"].map(
              (value) => (
                <SelectItem key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-4 max-h-[90dvh] -translate-y-0 overflow-y-auto overscroll-contain rounded-3xl p-5 sm:max-w-3xl sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle>Chart date range</DialogTitle>
            <DialogDescription>
              Applies to every chart in Trends.
            </DialogDescription>
          </DialogHeader>
          {editor}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Back to charts
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
