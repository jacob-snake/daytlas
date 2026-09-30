"use client";
import { trackProductEvent } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import { setMode, reloadSession } from "@/lib/oura/client";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import Link from "next/link";
import { useOuraSession } from "@/lib/use-oura-query";

export function DemoButton({
  className,
  variant = "default",
  alwaysDemo = false,
}: {
  className?: string;
  variant?: "default" | "outline";
  alwaysDemo?: boolean;
}) {
  const session = useOuraSession();
  if (session && !alwaysDemo) {
    return (
      <Button size="lg" variant={variant} className={className} asChild>
        <Link href="/app">
          {session === "demo" ? "Continue the demo" : "Open your dashboard"}
          <Icon icon={ArrowUpRight01Icon} className="ml-2 size-4" />
        </Link>
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      variant={variant}
      className={className}
      onClick={() => {
        trackProductEvent("website_interacted", { action: "demo_opened" });
        setMode("demo");
        reloadSession("/app");
      }}
    >
      {alwaysDemo ? "See demo" : "Explore the demo"}{" "}
      <Icon icon={ArrowUpRight01Icon} className="ml-2 size-4" />
    </Button>
  );
}
