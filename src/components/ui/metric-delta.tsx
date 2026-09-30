"use client";

import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export function MetricDelta({
  value,
  unit,
  polarity = "direction",
  className,
}: {
  value: number | null;
  unit?: string;
  polarity?: "higher" | "lower" | "neutral" | "direction";
  className?: string;
}) {
  const rounded =
    value !== null && Number.isFinite(value) ? Number(value.toFixed(1)) : null;
  const direction =
    rounded === null || rounded === 0 ? 0 : rounded > 0 ? 1 : -1;
  const favorable = polarity !== "lower" ? direction > 0 : direction < 0;
  const tone =
    direction === 0 || polarity === "neutral"
      ? "bg-muted text-foreground"
      : favorable
        ? "bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-300"
        : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm leading-5 font-bold tabular-nums",
        tone,
        className,
      )}
    >
      <Icon
        icon={
          direction > 0
            ? ArrowUp02Icon
            : direction < 0
              ? ArrowDown02Icon
              : MinusSignIcon
        }
        className="size-4"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>
        {rounded === null
          ? "Not enough data"
          : `${direction > 0 ? "+" : direction < 0 ? "−" : ""}${Math.abs(rounded).toFixed(1)}`}
        {rounded !== null && unit?.trim() && (
          <span className="ml-1">{unit.trim()}</span>
        )}
      </span>
    </span>
  );
}
