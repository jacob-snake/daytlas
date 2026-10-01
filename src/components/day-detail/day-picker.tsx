"use client";
import { useRef } from "react";
import { format } from "date-fns";
import { DayDateControls } from "./date-controls";
import { FloatingControls } from "@/components/ui/floating-controls";
import { Card, CardContent } from "@/components/ui/card";
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
    <FloatingControls
      controls={
        <DayDateControls
          day={day}
          today={today}
          onChoose={onChoose}
          onToday={onToday}
          compact
        />
      }
    >
      <Card>
        <CardContent>
          <input id="detail-day" type="hidden" value={day} />
          <DayDateControls
            day={day}
            today={today}
            onChoose={onChoose}
            onToday={onToday}
          />
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
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
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
    </FloatingControls>
  );
}
