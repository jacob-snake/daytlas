/* eslint-disable @next/next/no-img-element -- Exact, local approved artwork; no image transformation. */
import { BrandOrbit } from "@/components/brand-orbit";
import { brand } from "@/lib/brand-config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import "./brand.css";

/** Shared artwork: original sphere pixels, transparent SVG silhouette, outlined wordmark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={brand.assets.symbol}
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      className={cn("size-12", className)}
    />
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("brand-artwork", className)} aria-hidden="true">
      <BrandOrbit className="brand-artwork-full" />
      <img
        className="brand-artwork-compact"
        src={brand.assets.wordmark}
        alt=""
        width={104}
        height={30}
      />
    </span>
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
        "inline-flex shrink-0 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4",
        revealWebsite && "brand-home-roll",
        className,
      )}
    >
      {revealWebsite ? (
        <span className="brand-roll-window" aria-hidden="true">
          <span className="brand-roll-face brand-roll-logo">
            <BrandLogo />
          </span>
          <span className="brand-roll-face brand-roll-destination">
            <ArrowLeft className="size-5" />
            Back to website
          </span>
        </span>
      ) : (
        <BrandLogo />
      )}
    </Link>
  );
}
