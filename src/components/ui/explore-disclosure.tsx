import type { ReactNode } from "react";
import { ChevronDown, ChartNoAxesCombined } from "lucide-react";
export function ExploreDisclosure({ children }: { children: ReactNode }) {
  return (
    <details className="group/explore rounded-[24px] border border-border bg-card">
      <summary className="flex min-h-24 cursor-pointer list-none items-center gap-4 rounded-[24px] p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6 [&::-webkit-details-marker]:hidden">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary"
          aria-hidden="true"
        >
          <ChartNoAxesCombined className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">
            Explore more of your history
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Distributions, changes and personal milestones
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform group-open/explore:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-border p-5 sm:p-6">{children}</div>
    </details>
  );
}
