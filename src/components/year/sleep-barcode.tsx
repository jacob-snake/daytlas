"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";

// Each night = one thin vertical bar from bedtime to wake-up on a clock axis
// (18:00 → 14:00 next day). A year of nights reads like a barcode of rhythm.

const RAMP = ["#e7efff", "#bcd3fb", "#84adf5", "#4a80ec", "#2058d4", "#0d3695", "#071d55"];

const Y_MIN = 18; // 18:00
const Y_MAX = 38; // 14:00 next day
const H = 320;

const yFor = (clock: number) => ((clock - Y_MIN) / (Y_MAX - Y_MIN)) * H;

export function SleepBarcode({ rows }: { rows: DayRow[] }) {
  const [hover, setHover] = useState<DayRow | null>(null);

  const bars = useMemo(
    () =>
      rows
        .filter((r) => typeof r.bedtime === "number" && typeof r.wakeup_time === "number")
        .map((r) => {
          const start = r.bedtime as number; // evening-shifted (25.5 = 1:30)
          let end = (r.wakeup_time as number) + 24;
          if (end < start) end = start + 0.5;
          const score = (r.sleep_score as number | null) ?? null;
          return { r, start, end, score };
        }),
    [rows]
  );

  const scores = bars.map((b) => b.score).filter((s): s is number => s !== null);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const W = bars.length * 3;
  const clock = (v: number) => `${String(Math.floor(v % 24)).padStart(2, "0")}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`;

  if (!bars.length) return null;

  return (
    <div>
      <div className="mb-2 h-5 text-sm text-muted-foreground" aria-live="polite">
        {hover
          ? `${format(new Date(hover.day as string), "EEE, d MMM yyyy")} — asleep ${clock(hover.bedtime as number)} → ${clock(hover.wakeup_time as number)} · ${hover.total_sleep ?? "–"} h · score ${hover.sleep_score ?? "–"}`
          : "Every night, bedtime to wake-up. Darker = better sleep score."}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W + 44} ${H + 20}`}
          width="100%"
          style={{ minWidth: Math.min(W + 44, 1400) }}
          height={H + 20}
          onMouseLeave={() => setHover(null)}
          tabIndex={0}
          role="img"
          aria-label={`Sleep rhythm barcode: ${bars.length} nights, bedtime to wake-up on a clock axis. Use left and right arrow keys to browse nights.`}
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const idx = hover ? bars.findIndex((b) => b.r === hover) : 0;
            const next = bars[Math.max(0, Math.min(bars.length - 1, idx + (e.key === "ArrowRight" ? 1 : -1)))];
            if (next) setHover(next.r);
          }}
        >
          {[20, 24, 28, 32, 36].map((t) => (
            <g key={t}>
              <line x1={44} x2={W + 44} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={0} y={yFor(t) + 3} fontSize={10} fill="var(--muted-foreground)">
                {clock(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            let fill = "var(--muted)";
            if (b.score !== null && max > min) {
              const t = (b.score - min) / (max - min);
              fill = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
            }
            return (
              <rect
                key={b.r.day as string}
                x={44 + i * 3}
                y={yFor(b.start)}
                width={2.2}
                height={Math.max(2, yFor(b.end) - yFor(b.start))}
                rx={1.1}
                fill={fill}
                opacity={hover && hover !== b.r ? 0.45 : 1}
                onMouseEnter={() => setHover(b.r)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
