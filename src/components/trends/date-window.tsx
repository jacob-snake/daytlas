"use client";
import { useId, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/components/date-range-picker";
import { inclusiveDays } from "@/lib/date-selection";
import { isDay, parseDay } from "@/lib/dates";
import { Icon } from "@/components/icon";
import { Calendar03Icon } from "@hugeicons/core-free-icons";

export function DateWindow({
  start,
  end,
  min,
  max,
  onChange,
}: {
  start: string;
  end: string;
  min?: string;
  max: string;
  onChange: (start: string, end: string) => void;
}) {
  const id = useId();
  const mobile = useIsMobile();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [synced, setSynced] = useState(`${start}:${end}`);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selection, setSelection] = useState<DateRange | undefined>();
  // Sync external presets/dragging without remounting a focused date input.
  if (synced !== `${start}:${end}`) {
    setSynced(`${start}:${end}`);
    setFrom(start);
    setTo(end);
  }
  const validRange = (a: string, b: string) =>
    isDay(a) && isDay(b) && a <= b && b <= max && (!min || a >= min);
  const valid = validRange(from, to);
  const update = (a: string, b: string) => {
    setFrom(a);
    setTo(b);
    if (validRange(a, b)) onChange(a, b);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}-from`}>From</Label>
          <Input
            id={`${id}-from`}
            type="date"
            value={from}
            min={min}
            max={to || max}
            onChange={(e) => update(e.currentTarget.value, to)}
            className="min-h-12 w-full min-w-0 rounded-xl"
            aria-invalid={!valid || undefined}
            aria-describedby={!valid ? `${id}-error` : undefined}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}-to`}>To</Label>
          <Input
            id={`${id}-to`}
            type="date"
            value={to}
            min={from || min}
            max={max}
            onChange={(e) => update(from, e.currentTarget.value)}
            className="min-h-12 w-full min-w-0 rounded-xl"
            aria-invalid={!valid || undefined}
            aria-describedby={!valid ? `${id}-error` : undefined}
          />
        </div>
        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            setCalendarOpen(open);
            setSelection(undefined);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="col-span-2 min-h-12 rounded-xl sm:col-span-1"
            >
              <Icon icon={Calendar03Icon} className="size-4" /> Calendar
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-auto max-w-[calc(100vw-4px)] p-1 sm:p-2"
          >
            <Calendar
              className="range-calendar"
              mode="range"
              captionLayout="dropdown"
              numberOfMonths={mobile ? 1 : 2}
              defaultMonth={parseDay(start)}
              startMonth={parseDay(min ?? "2000-01-01")}
              endMonth={parseDay(max)}
              selected={
                selection ?? { from: parseDay(start), to: parseDay(end) }
              }
              showOutsideDays={false}
              weekStartsOn={1}
              disabled={[
                { after: parseDay(max) },
                ...(min ? [{ before: parseDay(min) }] : []),
              ]}
              onSelect={(_, day) => {
                if (selection?.from && !selection.to) {
                  const from = day < selection.from ? day : selection.from;
                  const to = day < selection.from ? selection.from : day;
                  setSelection({ from, to });
                  update(format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"));
                } else setSelection({ from: day, to: undefined });
              }}
            />
            <p
              className="px-3 pb-2 text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {selection?.from && !selection.to
                ? "Choose an end date."
                : "Changes apply immediately."}
            </p>
          </PopoverContent>
        </Popover>
      </div>
      {!valid ? (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive"
          role="status"
        >
          Choose a valid date range within your available history.
        </p>
      ) : (
        <p
          className="text-center text-sm font-medium text-muted-foreground"
          role="status"
        >
          <span className="font-semibold tabular-nums text-foreground">
            {inclusiveDays(start, end).toLocaleString()} days
          </span>{" "}
          · Changes apply immediately
        </p>
      )}
    </div>
  );
}
