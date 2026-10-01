"use client";
import { useRef } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDay, shiftDay } from "@/lib/dates";
import "./day-picker.css";

export function DayPicker({
  day,
  today,
  recorded,
  loaded,
  onChoose,
  onToday,
}: {
  day: string;
  today: string;
  recorded: Set<string>;
  loaded: boolean;
  onChoose: (day: string) => void;
  onToday: () => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const last = shiftDay(day, 5) > today ? today : shiftDay(day, 5);
  const days = Array.from({ length: 11 }, (_, i) => shiftDay(last, i - 10));
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {format(parseDay(day), "EEEE d MMMM")}
            </h2>
            <label htmlFor="detail-day" className="sr-only">
              Day detail
            </label>
            <Input
              id="detail-day"
              type="date"
              value={day}
              max={today}
              onChange={(e) => onChoose(e.target.value)}
              className="w-auto border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none"
            />
          </div>
          <div className="flex items-center gap-1">
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
        <div
          ref={strip}
          className="day-orb-strip"
          role="group"
          aria-label="Choose a day"
        >
          {days.map((date, index) => (
            <button
              key={date}
              type="button"
              data-current={date === day}
              data-recorded={recorded.has(date)}
              data-loaded={loaded}
              data-near={
                index >= Math.max(0, Math.min(4, days.indexOf(day) - 3)) &&
                index < Math.max(0, Math.min(4, days.indexOf(day) - 3)) + 7
              }
              aria-pressed={date === day}
              aria-label={`${format(parseDay(date), "EEEE, d MMMM yyyy")}${loaded && !recorded.has(date) ? ", no record returned" : ""}`}
              className="day-orb-button"
              onClick={() => onChoose(date)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const visible = Array.from(
                  strip.current?.querySelectorAll<HTMLButtonElement>(
                    "button",
                  ) ?? [],
                ).filter((button) => button.getClientRects().length > 0);
                const position = visible.indexOf(e.currentTarget);
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? visible.length - 1
                      : Math.max(
                          0,
                          Math.min(
                            visible.length - 1,
                            position + (e.key === "ArrowRight" ? 1 : -1),
                          ),
                        );
                visible[next]?.focus();
              }}
            >
              <span className="text-xs text-muted-foreground">
                {format(parseDay(date), "EEE")}
              </span>
              <span className="day-picker-orb" aria-hidden="true" />
              <span className="text-sm font-semibold tabular-nums">
                {format(parseDay(date), "d")}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
