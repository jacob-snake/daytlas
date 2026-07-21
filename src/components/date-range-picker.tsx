"use client";
import { Icon } from "@/components/icon";
import { Calendar03Icon } from "@hugeicons/core-free-icons";

import { useEffect, useState } from "react";
import { format, subDays, subMonths, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface Range {
  start: string; // yyyy-MM-dd
  end: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const PRESETS: { label: string; range: () => Range }[] = [
  { label: "Last 30 days", range: () => ({ start: iso(subDays(new Date(), 30)), end: iso(new Date()) }) },
  { label: "Last 90 days", range: () => ({ start: iso(subDays(new Date(), 90)), end: iso(new Date()) }) },
  { label: "Last 6 months", range: () => ({ start: iso(subMonths(new Date(), 6)), end: iso(new Date()) }) },
  { label: "Last year", range: () => ({ start: iso(subYears(new Date(), 1)), end: iso(new Date()) }) },
  { label: "Last 3 years", range: () => ({ start: iso(subYears(new Date(), 3)), end: iso(new Date()) }) },
];

/** True below Tailwind's sm breakpoint — used to drop to a single calendar month. */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function DateRangePicker({
  value,
  onChange,
  allDataStart,
}: {
  value: Range;
  onChange: (r: Range) => void;
  /** Earliest day with data — enables the "All data" preset. */
  allDataStart?: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const selected: DateRange = {
    from: new Date(value.start),
    to: new Date(value.end),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-0 justify-start font-normal sm:min-w-[240px]">
          <Icon icon={Calendar03Icon} data-icon="inline-start" className="text-muted-foreground" />
          <span className="truncate">
            {format(selected.from!, "d MMM yyyy")} – {format(selected.to!, "d MMM yyyy")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <div className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-h-none sm:flex-row">
          <div className="flex gap-1 overflow-x-auto p-3 sm:flex-col">
            {allDataStart && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 justify-start font-semibold"
                onClick={() => {
                  onChange({ start: allDataStart, end: iso(new Date()) });
                  setOpen(false);
                }}
              >
                All data
              </Button>
            )}
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="shrink-0 justify-start font-normal"
                onClick={() => {
                  onChange(p.range());
                  setOpen(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Separator className="sm:hidden" />
          <Separator orientation="vertical" className="hidden h-auto sm:block" />
          <div>
            <div className="flex items-center gap-3 border-b px-4 py-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">From</p>
                <p className="font-semibold tabular-nums">{format(selected.from!, "d MMM yyyy")}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">To</p>
                <p className="font-semibold tabular-nums">{format(selected.to!, "d MMM yyyy")}</p>
              </div>
            </div>
            <Calendar
              mode="range"
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={selected.from}
              selected={selected}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  onChange({ start: iso(r.from), end: iso(r.to) });
                }
              }}
              disabled={{ after: new Date() }}
              classNames={{
                day: "size-9 sm:size-10 rounded-full text-[13px] font-medium",
                range_middle:
                  "bg-[color-mix(in_oklab,var(--chart-1)_16%,transparent)] rounded-none first:rounded-l-full last:rounded-r-full",
                range_start: "rounded-full bg-primary text-primary-foreground",
                range_end: "rounded-full bg-primary text-primary-foreground",
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
