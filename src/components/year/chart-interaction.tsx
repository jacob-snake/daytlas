"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function chartMarkAnchor(
  container: HTMLElement | null,
  mark: SVGGraphicsElement | null,
) {
  if (!container || !mark) return null;
  const host = container.getBoundingClientRect(),
    box = mark.getBoundingClientRect();
  return { x: box.left + box.width / 2 - host.left, y: box.top - host.top };
}

export function useChartWidth(minimum: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(minimum);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width: Math.max(minimum, available) };
}

/** A visible, clipped-to-chart tooltip for pointer, touch and keyboard selections. */
export function YearChartTooltip({
  anchor,
  children,
}: {
  anchor: { x: number; y: number } | null;
  children: ReactNode;
}) {
  if (!anchor) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-56 max-w-[calc(100%-1rem)] rounded-xl bg-foreground px-3 py-2.5 text-sm leading-relaxed text-background shadow-lg"
      style={{
        left: `clamp(8px, ${anchor.x - 112}px, calc(100% - 232px))`,
        top: Math.max(8, anchor.y - 94),
      }}
    >
      {children}
    </div>
  );
}
