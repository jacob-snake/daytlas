import type { ReactNode } from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";

export function FaqItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="group/faq rounded-2xl bg-card shadow-[var(--shadow-border)]">
      <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-5 rounded-2xl px-5 py-5 text-base font-semibold leading-snug focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary transition-transform duration-150 group-open/faq:rotate-45 motion-reduce:transition-none">
          <Icon icon={Add01Icon} className="size-4" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-5 pb-6 pr-8 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
