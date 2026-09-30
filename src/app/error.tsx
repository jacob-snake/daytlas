"use client";
import { brand } from "@/lib/brand-config";

import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-3xl font-medium tracking-tight">
        This view needs a fresh start.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Something interrupted the page. Try again or return to the overview.
        Your records at Oura are unaffected.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to {brand.name}</Link>
        </Button>
      </div>
    </main>
  );
}
