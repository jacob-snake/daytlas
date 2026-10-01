"use client";
import { useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseDay, shiftDay } from "@/lib/dates";
export function DayDateControls({
  day,
  today,
  onChoose,
  onToday,
  compact = false,
}: {
  day: string;
  today: string;
  onChoose: (day: string) => void;
  onToday: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="flex min-w-0 flex-wrap items-center justify-between gap-3"
      role="group"
      aria-label={compact ? "Floating day controls" : "Day controls"}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            aria-label={`Choose a date: ${format(parseDay(day), "d MMMM yyyy")}`}
            className="!h-auto min-h-14 min-w-0 !justify-start !rounded-xl !bg-secondary/60 px-4 py-3 text-left"
          >
            <CalendarDays className="size-5 shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">
                Choose a date
              </span>
              <span className="mt-1 block text-sm font-bold sm:text-base">
                {format(parseDay(day), "d MMM yyyy")}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-16px)] p-2"
        >
          <Calendar
            className="range-calendar"
            mode="single"
            required
            selected={parseDay(day)}
            defaultMonth={parseDay(day)}
            captionLayout="dropdown"
            startMonth={parseDay("2000-01-01")}
            endMonth={parseDay(today)}
            disabled={{ after: parseDay(today) }}
            weekStartsOn={1}
            onSelect={(date) => {
              if (date) {
                onChoose(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          onClick={() => onChoose(shiftDay(day, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          disabled={day >= today}
          onClick={() => onChoose(shiftDay(day, 1))}
        >
          <ChevronRight />
        </Button>
        <Button variant="outline" onClick={onToday}>
          Today
        </Button>
      </div>
    </div>
  );
}
