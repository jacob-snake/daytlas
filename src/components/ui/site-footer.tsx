import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@/lib/brand-config";

/** Shared dark footer for public pages and product surfaces. */
export function SiteFooter({ actions }: { actions?: ReactNode }) {
  return (
    <footer className="site-footer mt-14 mb-5 rounded-[28px] px-7 py-9 sm:px-10 sm:py-11">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/"
            className="text-2xl font-semibold tracking-[-0.045em] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {brand.name}
          </Link>
          <p className="mt-3 text-sm text-white/65">
            Your days, in a bigger picture.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:gap-x-12"
        >
          {[
            { href: "/about", label: "Our story" },
            { href: "/privacy", label: "Privacy" },
            { href: "/install", label: "Add to home screen" },
            { href: "/terms", label: "Terms" },
            { href: brand.sourceUrl, label: "Source code" },
            {
              href: "/privacy#analytics-settings",
              label: "Analytics settings",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/15 pt-5 sm:flex-row sm:items-center">
        <p className="text-xs leading-relaxed text-white/60">
          By Jakub Had. Independent of Oura. Not medical advice.
        </p>
        {actions}
      </div>
    </footer>
  );
}
