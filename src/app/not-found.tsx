import { brand } from "@/lib/brand-config";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center px-6 text-center"
    >
      <Brand />
      <p className="mt-10 text-xs text-muted-foreground">404</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">
        A little off the path.
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This page doesn’t exist. Your bigger picture is back at the overview.
      </p>
      <Button asChild className="mt-7">
        <Link href="/">Back to {brand.name}</Link>
      </Button>
    </main>
  );
}
