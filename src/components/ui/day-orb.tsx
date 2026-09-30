import { cn } from "@/lib/utils";

export type DayOrbState = "recorded" | "met" | "shorter" | "missing";

/** A data mark, not a control. Supply a label or describe it in the parent. */
export function DayOrb({
  state = "recorded",
  tone = "sleep",
  size = "md",
  label,
  className,
}: {
  state?: DayOrbState;
  tone?: "sleep" | "readiness" | "activity";
  size?: "legend" | "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  return (
    <span
      data-slot="day-orb"
      data-state={state}
      data-tone={tone}
      data-size={size}
      className={cn("ds-day-orb", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {(state === "met" || state === "shorter") && (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d={state === "met" ? "m5 10 3.3 3.3L15 6.7" : "M5.5 10h9"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
