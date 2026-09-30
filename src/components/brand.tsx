import { brand } from "@/lib/brand-config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import "./brand.css";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={cn("size-9", className)}
    >
      <rect width="36" height="36" rx="12" fill="currentColor" />
      <text
        x="18"
        y="25"
        textAnchor="middle"
        fill="var(--background)"
        fontSize="22"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {brand.initial}
      </text>
    </svg>
  );
}
export function Brand({
  className,
  revealWebsite = false,
}: {
  className?: string;
  revealWebsite?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={
        revealWebsite ? `${brand.name} — Back to website` : `${brand.name} home`
      }
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl text-[23px] font-semibold tracking-[-0.06em] focus-visible:outline-2 focus-visible:outline-offset-4",
        revealWebsite && "brand-home-roll",
        className,
      )}
    >
      {revealWebsite ? (
        <span className="brand-roll-window" aria-hidden="true">
          <span className="brand-roll-face brand-roll-logo">
            <BrandMark />
            {brand.name}
          </span>
          <span className="brand-roll-face brand-roll-destination">
            <ArrowLeft className="size-5" />
            Back to website
          </span>
        </span>
      ) : (
        <>
          <BrandMark />
          {brand.name}
        </>
      )}
    </Link>
  );
}
