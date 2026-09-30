import type { ReactNode } from "react";
/** Readable homepage-sized badge; distinct from compact data/status badges. */
export function Eyebrow({
  children,
  leading,
}: {
  children: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-card px-4 py-2.5 text-sm font-medium leading-snug shadow-[var(--shadow-border)] sm:px-5 sm:text-base">
      {leading ?? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-chart-2"
        />
      )}
      {children}
    </span>
  );
}
