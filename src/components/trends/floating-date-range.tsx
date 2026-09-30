"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, ChevronDown } from "lucide-react";
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
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
      >
        <div className="min-w-0 px-1 sm:px-2">
          <p className="px-3 text-xs font-medium text-muted-foreground">
            View by
          </p>
          <Select
            value={period}
            onValueChange={(value) => onPeriodChange(value as Period)}
          >
            <SelectTrigger
              aria-label="View all charts by period"
              className="!border-transparent !bg-transparent !shadow-none min-w-24 px-3"
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
        <Button
          ref={trigger}
          variant="ghost"
          aria-describedby={summaryId}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Edit date range: ${summary}`}
          className="!h-auto min-h-16 min-w-0 justify-start gap-3 !rounded-2xl !bg-secondary/60 px-3 py-2 text-left hover:!bg-secondary sm:px-4"
          onClick={() => setOpen(true)}
        >
          <CalendarDays
            className="hidden size-5 shrink-0 sm:block"
            aria-hidden="true"
          />
          <span id={summaryId} className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">
              Date range
            </span>
            <span className="mt-1 block whitespace-normal text-xs font-bold tabular-nums sm:text-base">
              {summary}
            </span>
          </span>
          <ChevronDown className="ml-auto size-4 shrink-0" aria-hidden="true" />
        </Button>
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
