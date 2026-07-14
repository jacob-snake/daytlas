"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
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
  const selected: DateRange = {
    from: new Date(value.start),
    to: new Date(value.end),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[240px] justify-start font-normal">
          <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
          {format(selected.from!, "d MMM yyyy")} – {format(selected.to!, "d MMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 p-3">
            {allDataStart && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-semibold"
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
                className="justify-start font-normal"
                onClick={() => {
                  onChange(p.range());
                  setOpen(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-auto" />
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={selected.from}
            selected={selected}
            onSelect={(r) => {
              if (r?.from && r?.to) {
                onChange({ start: iso(r.from), end: iso(r.to) });
              }
            }}
            disabled={{ after: new Date() }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
