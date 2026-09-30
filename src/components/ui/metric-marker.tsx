import { cn } from "@/lib/utils";
/** One consistent circular metric key across cards, chart legends and tooltips. */
export function MetricMarker({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
